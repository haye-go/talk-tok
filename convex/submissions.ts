import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const MAX_BODY_LENGTH = 8_000;
const MIN_BODY_LENGTH = 5;
const RATE_LIMIT_WINDOW_MS = 30_000;
const RATE_LIMIT_MAX_SUBMISSIONS = 5;
const DUPLICATE_WINDOW_MS = 20_000;
const DEFAULT_LIST_LIMIT = 40;
const MAX_LIST_LIMIT = 100;
const FAST_COMPOSITION_MS = 8_000;
const GRADUAL_COMPOSITION_MS = 25_000;
const LARGE_PASTE_CHARACTER_COUNT = 120;
const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

type InputPattern = "composed_gradually" | "likely_pasted" | "mixed" | "unknown";
type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function numberFrom(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeSessionSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeBody(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeForDuplicateCheck(value: string) {
  return normalizeBody(value).toLowerCase();
}

function countWords(value: string) {
  return value.trim().match(WORD_PATTERN)?.length ?? 0;
}

async function hashClientKey(clientKey: string) {
  const data = new TextEncoder().encode(clientKey);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function deriveInputPattern(args: {
  body: string;
  compositionMs?: number;
  pasteEventCount: number;
  pastedCharacterCount?: number;
  keystrokeCount: number;
}): InputPattern {
  const normalizedBody = normalizeBody(args.body);

  if (!normalizedBody) {
    return "unknown";
  }

  const pastedCharacterCount = args.pastedCharacterCount ?? 0;
  const hasPaste = args.pasteEventCount > 0 || pastedCharacterCount > 0;
  const largePaste = pastedCharacterCount >= LARGE_PASTE_CHARACTER_COUNT;
  const veryFast =
    typeof args.compositionMs === "number" && args.compositionMs <= FAST_COMPOSITION_MS;
  const gradual =
    typeof args.compositionMs === "number" &&
    args.compositionMs >= GRADUAL_COMPOSITION_MS &&
    args.keystrokeCount >= Math.min(20, Math.ceil(normalizedBody.length / 8));

  if (hasPaste && (largePaste || veryFast || args.keystrokeCount < normalizedBody.length / 8)) {
    return "likely_pasted";
  }

  if (hasPaste) {
    return "mixed";
  }

  if (gradual) {
    return "composed_gradually";
  }

  return "unknown";
}

function toPublicSubmission(
  submission: Doc<"submissions">,
  participant: Doc<"participants"> | null,
  session: Doc<"sessions">,
) {
  return {
    id: submission._id,
    sessionId: submission.sessionId,
    participantId: submission.participantId,
    participantSlug: participant?.participantSlug ?? "unknown",
    nickname:
      session.anonymityMode === "anonymous_to_peers"
        ? "Anonymous"
        : (participant?.nickname ?? "Unknown"),
    body: submission.body,
    parentSubmissionId: submission.parentSubmissionId,
    followUpPromptId: submission.followUpPromptId,
    kind: submission.kind,
    wordCount: submission.wordCount,
    typingStartedAt: submission.typingStartedAt,
    typingFinishedAt: submission.typingFinishedAt,
    compositionMs: submission.compositionMs,
    pasteEventCount: submission.pasteEventCount,
    keystrokeCount: submission.keystrokeCount,
    inputPattern: submission.inputPattern,
    createdAt: submission.createdAt,
  };
}

async function getSessionBySlug(ctx: QueryCtx | MutationCtx, sessionSlug: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_slug", (q) => q.eq("slug", normalizeSessionSlug(sessionSlug)))
    .unique();
}

async function getParticipantByClientKey(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"sessions">,
  clientKey: string,
) {
  const clientKeyHash = await hashClientKey(clientKey);

  return await ctx.db
    .query("participants")
    .withIndex("by_session_and_client_key_hash", (q) =>
      q.eq("sessionId", sessionId).eq("clientKeyHash", clientKeyHash),
    )
    .unique();
}

async function getRecentParticipantSubmissions(
  ctx: QueryCtx | MutationCtx,
  participantId: Id<"participants">,
  limit: number,
) {
  return await ctx.db
    .query("submissions")
    .withIndex("by_participant_and_created_at", (q) => q.eq("participantId", participantId))
    .order("desc")
    .take(limit);
}

async function assertSubmissionAllowed(
  ctx: MutationCtx,
  participantId: Id<"participants">,
  body: string,
  now: number,
  limits: { maxSubmissions: number; windowMs: number },
) {
  const recentSubmissions = await getRecentParticipantSubmissions(
    ctx,
    participantId,
    limits.maxSubmissions + 5,
  );
  const recentInWindow = recentSubmissions.filter(
    (submission) => now - submission.createdAt <= limits.windowMs,
  );

  if (recentInWindow.length >= limits.maxSubmissions) {
    throw new Error(
      "You are submitting too quickly. Wait a moment before adding another response.",
    );
  }

  const duplicate = recentSubmissions.find(
    (submission) =>
      now - submission.createdAt <= DUPLICATE_WINDOW_MS &&
      normalizeForDuplicateCheck(submission.body) === normalizeForDuplicateCheck(body),
  );

  if (duplicate) {
    throw new Error("This looks like a duplicate submission.");
  }
}

export const create = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    body: v.string(),
    kind: v.union(v.literal("initial"), v.literal("additional_point"), v.literal("reply")),
    parentSubmissionId: v.optional(v.id("submissions")),
    followUpPromptId: v.optional(v.id("followUpPrompts")),
    telemetry: v.object({
      typingStartedAt: v.optional(v.number()),
      typingFinishedAt: v.optional(v.number()),
      compositionMs: v.optional(v.number()),
      pasteEventCount: v.number(),
      pastedCharacterCount: v.optional(v.number()),
      keystrokeCount: v.number(),
      inputPattern: v.optional(
        v.union(
          v.literal("composed_gradually"),
          v.literal("likely_pasted"),
          v.literal("mixed"),
          v.literal("unknown"),
        ),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const participant = await getParticipantByClientKey(ctx, session._id, args.clientKey);

    if (!participant) {
      throw new Error("Participant not found.");
    }

    const contentLimits = asRecord(
      await ctx.runQuery(internal.protection.loadSetting, {
        key: "contentLimits",
        sessionId: session._id,
      }),
    );
    const rateLimits = asRecord(
      await ctx.runQuery(internal.protection.loadSetting, {
        key: "rateLimits",
        sessionId: session._id,
      }),
    );
    const minBodyLength = numberFrom(contentLimits.minSubmissionCharacters, MIN_BODY_LENGTH);
    const maxBodyLength = numberFrom(contentLimits.maxSubmissionCharacters, MAX_BODY_LENGTH);
    const maxSubmissions = numberFrom(rateLimits.submissionsPerWindow, RATE_LIMIT_MAX_SUBMISSIONS);
    const submissionWindowMs = numberFrom(rateLimits.submissionWindowMs, RATE_LIMIT_WINDOW_MS);
    const body = normalizeBody(args.body);

    if (body.length < minBodyLength) {
      throw new Error("Response is too short.");
    }

    if (body.length > maxBodyLength) {
      throw new Error(`Response must be ${maxBodyLength} characters or fewer.`);
    }

    if (args.kind === "initial" && args.parentSubmissionId) {
      throw new Error("Top-level responses cannot have a parent submission.");
    }

    if (args.followUpPromptId && args.kind === "initial") {
      throw new Error("Follow-up responses cannot be initial submissions.");
    }

    if (args.followUpPromptId) {
      const followUpPrompt = await ctx.db.get(args.followUpPromptId);

      if (
        !followUpPrompt ||
        followUpPrompt.sessionId !== session._id ||
        followUpPrompt.status !== "active"
      ) {
        throw new Error("Follow-up prompt is not active in this session.");
      }

      if (followUpPrompt.targetMode === "categories") {
        const targets = await ctx.db
          .query("followUpTargets")
          .withIndex("by_prompt", (q) => q.eq("followUpPromptId", followUpPrompt._id))
          .take(20);
        const targetCategoryIds = new Set(
          targets
            .map((target) => target.categoryId)
            .filter((categoryId): categoryId is Id<"categories"> => Boolean(categoryId)),
        );
        const recentSubmissions = await getRecentParticipantSubmissions(ctx, participant._id, 100);
        let eligible = false;

        for (const submission of recentSubmissions) {
          const assignments = await ctx.db
            .query("submissionCategories")
            .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
            .take(8);

          if (assignments.some((assignment) => targetCategoryIds.has(assignment.categoryId))) {
            eligible = true;
            break;
          }
        }

        if (!eligible) {
          throw new Error("This follow-up is not targeted to this participant.");
        }
      }
    }

    if ((args.kind === "reply" || args.kind === "additional_point") && args.parentSubmissionId) {
      const parent = await ctx.db.get(args.parentSubmissionId);

      if (!parent || parent.sessionId !== session._id) {
        throw new Error("Parent submission not found in this session.");
      }
    }

    const now = Date.now();
    await assertSubmissionAllowed(ctx, participant._id, body, now, {
      maxSubmissions,
      windowMs: submissionWindowMs,
    });

    const compositionMs =
      typeof args.telemetry.compositionMs === "number"
        ? args.telemetry.compositionMs
        : args.telemetry.typingStartedAt && args.telemetry.typingFinishedAt
          ? Math.max(0, args.telemetry.typingFinishedAt - args.telemetry.typingStartedAt)
          : undefined;
    const inputPattern = deriveInputPattern({
      body,
      compositionMs,
      pasteEventCount: args.telemetry.pasteEventCount,
      pastedCharacterCount: args.telemetry.pastedCharacterCount,
      keystrokeCount: args.telemetry.keystrokeCount,
    });

    const submissionId = await ctx.db.insert("submissions", {
      sessionId: session._id,
      participantId: participant._id,
      body,
      parentSubmissionId: args.parentSubmissionId,
      followUpPromptId: args.followUpPromptId,
      kind: args.kind,
      wordCount: countWords(body),
      typingStartedAt: args.telemetry.typingStartedAt,
      typingFinishedAt: args.telemetry.typingFinishedAt,
      compositionMs,
      pasteEventCount: Math.max(0, args.telemetry.pasteEventCount),
      keystrokeCount: Math.max(0, args.telemetry.keystrokeCount),
      inputPattern,
      createdAt: now,
    });

    await ctx.db.patch(participant._id, {
      presenceState: "submitted",
      lastSeenAt: now,
    });

    const submission = await ctx.db.get(submissionId);

    if (!submission) {
      throw new Error("Submission was not created.");
    }

    return toPublicSubmission(submission, participant, session);
  },
});

export const listForSession = query({
  args: {
    sessionSlug: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const limit = Math.min(MAX_LIST_LIMIT, Math.max(1, args.limit ?? DEFAULT_LIST_LIMIT));
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
      .order("desc")
      .take(limit);

    return await Promise.all(
      submissions.map(async (submission) => {
        const participant = await ctx.db.get(submission.participantId);
        return toPublicSubmission(submission, participant, session);
      }),
    );
  },
});

export const listMine = query({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const participant = await getParticipantByClientKey(ctx, session._id, args.clientKey);

    if (!participant) {
      return null;
    }

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_participant_and_created_at", (q) => q.eq("participantId", participant._id))
      .order("desc")
      .take(DEFAULT_LIST_LIMIT);

    return submissions.map((submission) => toPublicSubmission(submission, participant, session));
  },
});

export const getThread = query({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const root = await ctx.db.get(args.submissionId);

    if (!root) {
      return null;
    }

    const session = await ctx.db.get(root.sessionId);

    if (!session) {
      return null;
    }

    const rootParticipant = await ctx.db.get(root.participantId);
    const replies = await ctx.db
      .query("submissions")
      .withIndex("by_parent_submission", (q) => q.eq("parentSubmissionId", root._id))
      .take(80);

    return {
      root: toPublicSubmission(root, rootParticipant, session),
      replies: await Promise.all(
        replies
          .sort((a, b) => a.createdAt - b.createdAt)
          .map(async (reply) => {
            const participant = await ctx.db.get(reply.participantId);
            return toPublicSubmission(reply, participant, session);
          }),
      ),
    };
  },
});
