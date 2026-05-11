import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { rateLimiter } from "./components";

const REACTION_LIMIT = 200;
const reactionKindValidator = v.union(
  v.literal("agree"),
  v.literal("sharp"),
  v.literal("question"),
  v.literal("spark"),
  v.literal("changed_mind"),
);

function normalizeSessionSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function hashClientKey(clientKey: string) {
  const data = new TextEncoder().encode(clientKey);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
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

function emptyCounts() {
  return {
    agree: 0,
    sharp: 0,
    question: 0,
    spark: 0,
    changed_mind: 0,
  };
}

function countReactions(rows: Doc<"reactions">[]) {
  const counts = emptyCounts();

  for (const row of rows) {
    counts[row.kind] += 1;
  }

  return counts;
}

export const toggle = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    submissionId: v.id("submissions"),
    kind: reactionKindValidator,
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const participant = await getParticipantByClientKey(ctx, session._id, args.clientKey);
    const submission = await ctx.db.get(args.submissionId);

    if (!participant) {
      throw new Error("Participant not found.");
    }

    if (!submission || submission.sessionId !== session._id) {
      throw new Error("Submission not found in this session.");
    }

    await rateLimiter.limit(ctx, "reactionAction", { key: participant._id, throws: true });

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_submission_and_participant_and_kind", (q) =>
        q
          .eq("submissionId", submission._id)
          .eq("participantId", participant._id)
          .eq("kind", args.kind),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("reactions", {
        sessionId: session._id,
        submissionId: submission._id,
        participantId: participant._id,
        kind: args.kind,
        createdAt: Date.now(),
      });
    }

    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      actorType: "participant",
      actorParticipantId: participant._id,
      action: existing ? "reaction.removed" : "reaction.added",
      targetType: "submission",
      targetId: submission._id,
      metadataJson: { kind: args.kind },
    });

    const rows = await ctx.db
      .query("reactions")
      .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
      .take(REACTION_LIMIT);

    return {
      active: !existing,
      counts: countReactions(rows),
    };
  },
});

export const listForSubmission = query({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("reactions")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .take(REACTION_LIMIT);

    return {
      submissionId: args.submissionId,
      counts: countReactions(rows),
    };
  },
});

export const listForSubmissions = query({
  args: {
    sessionSlug: v.string(),
    submissionIds: v.array(v.id("submissions")),
    clientKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const participant = args.clientKey
      ? await getParticipantByClientKey(ctx, session._id, args.clientKey)
      : null;
    const uniqueSubmissionIds = [...new Set(args.submissionIds)].slice(0, 50);
    const results = [];

    for (const submissionId of uniqueSubmissionIds) {
      const submission = await ctx.db.get(submissionId);

      if (!submission || submission.sessionId !== session._id) {
        continue;
      }

      const rows = await ctx.db
        .query("reactions")
        .withIndex("by_submission", (q) => q.eq("submissionId", submissionId))
        .take(REACTION_LIMIT);

      results.push({
        submissionId,
        counts: countReactions(rows),
        myReactions: participant
          ? rows
              .filter((row) => row.participantId === participant._id)
              .map((row) => row.kind)
          : [],
      });
    }

    return results;
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

    const rows = await ctx.db
      .query("reactions")
      .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
      .order("desc")
      .take(Math.min(REACTION_LIMIT, Math.max(1, args.limit ?? 80)));
    const bySubmission = new Map<Id<"submissions">, Doc<"reactions">[]>();

    for (const row of rows) {
      bySubmission.set(row.submissionId, [...(bySubmission.get(row.submissionId) ?? []), row]);
    }

    return [...bySubmission.entries()].map(([submissionId, reactions]) => ({
      submissionId,
      counts: countReactions(reactions),
      recent: reactions.map((reaction) => ({
        id: reaction._id,
        participantId: reaction.participantId,
        kind: reaction.kind,
        createdAt: reaction.createdAt,
      })),
    }));
  },
});
