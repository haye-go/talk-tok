import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const FOLLOW_UP_LIMIT = 80;
const TARGET_LIMIT = 20;
const RESPONSE_LIMIT = 200;
const TITLE_MAX_LENGTH = 120;
const PROMPT_MAX_LENGTH = 2000;
const INSTRUCTIONS_MAX_LENGTH = 2000;

const toneValidator = v.union(
  v.literal("gentle"),
  v.literal("direct"),
  v.literal("spicy"),
  v.literal("roast"),
);

type PublicSubmissionResult = {
  id: Id<"submissions">;
  sessionId: Id<"sessions">;
  participantId: Id<"participants">;
  participantSlug: string;
  nickname: string;
  body: string;
  parentSubmissionId?: Id<"submissions">;
  followUpPromptId?: Id<"followUpPrompts">;
  kind: "initial" | "additional_point" | "reply" | "fight_me_turn";
  wordCount: number;
  typingStartedAt?: number;
  typingFinishedAt?: number;
  compositionMs?: number;
  pasteEventCount: number;
  keystrokeCount: number;
  inputPattern: "composed_gradually" | "likely_pasted" | "mixed" | "unknown";
  createdAt: number;
};

type PublicFeedbackResult = {
  id: Id<"submissionFeedback">;
  submissionId: Id<"submissions">;
  participantId: Id<"participants">;
  status: "queued" | "processing" | "success" | "error";
  tone: "gentle" | "direct" | "spicy" | "roast";
  reasoningBand?: "emerging" | "solid" | "strong" | "exceptional";
  originalityBand?: "common" | "above_average" | "distinctive" | "novel";
  specificityBand?: "basic" | "clear" | "detailed" | "nuanced";
  summary?: string;
  strengths?: string;
  improvement?: string;
  nextQuestion?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

type SubmitResponseResult = {
  submission: PublicSubmissionResult;
  feedback: PublicFeedbackResult | null;
};

function normalizeSessionSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "follow-up";
}

function normalizeTitle(value: string, fallback: string) {
  const title = (value.trim().replace(/\s+/g, " ") || fallback).slice(0, TITLE_MAX_LENGTH);

  if (title.length < 3) {
    throw new Error("Follow-up title must be at least 3 characters.");
  }

  return title;
}

function normalizePrompt(value: string) {
  const prompt = value.trim().replace(/\s+/g, " ");

  if (prompt.length < 5) {
    throw new Error("Follow-up prompt must be at least 5 characters.");
  }

  if (prompt.length > PROMPT_MAX_LENGTH) {
    throw new Error(`Follow-up prompt must be ${PROMPT_MAX_LENGTH} characters or fewer.`);
  }

  return prompt;
}

function normalizeInstructions(value?: string) {
  const instructions = value?.trim().replace(/\s+/g, " ");

  if (!instructions) {
    return undefined;
  }

  if (instructions.length > INSTRUCTIONS_MAX_LENGTH) {
    throw new Error(
      `Follow-up instructions must be ${INSTRUCTIONS_MAX_LENGTH} characters or fewer.`,
    );
  }

  return instructions;
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

async function createUniqueSlug(ctx: MutationCtx, sessionId: Id<"sessions">, title: string) {
  const baseSlug = slugify(title);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const existing = await ctx.db
      .query("followUpPrompts")
      .withIndex("by_session_slug", (q) => q.eq("sessionId", sessionId).eq("slug", candidate))
      .unique();

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Could not create a unique follow-up slug.");
}

async function getTargets(ctx: QueryCtx | MutationCtx, followUpPromptId: Id<"followUpPrompts">) {
  return await ctx.db
    .query("followUpTargets")
    .withIndex("by_prompt", (q) => q.eq("followUpPromptId", followUpPromptId))
    .take(TARGET_LIMIT);
}

async function getParticipantCategoryIds(
  ctx: QueryCtx | MutationCtx,
  participantId: Id<"participants">,
) {
  const submissions = await ctx.db
    .query("submissions")
    .withIndex("by_participant_and_created_at", (q) => q.eq("participantId", participantId))
    .order("desc")
    .take(100);
  const categoryIds = new Set<Id<"categories">>();

  for (const submission of submissions) {
    const assignments = await ctx.db
      .query("submissionCategories")
      .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
      .take(8);

    for (const assignment of assignments) {
      categoryIds.add(assignment.categoryId);
    }
  }

  return categoryIds;
}

async function assertParticipantEligible(
  ctx: QueryCtx | MutationCtx,
  prompt: Doc<"followUpPrompts">,
  participantId: Id<"participants">,
) {
  if (prompt.targetMode === "all") {
    return true;
  }

  const targets = await getTargets(ctx, prompt._id);
  const targetCategoryIds = new Set(
    targets
      .map((target) => target.categoryId)
      .filter((categoryId): categoryId is Id<"categories"> => Boolean(categoryId)),
  );
  const participantCategoryIds = await getParticipantCategoryIds(ctx, participantId);

  for (const categoryId of participantCategoryIds) {
    if (targetCategoryIds.has(categoryId)) {
      return true;
    }
  }

  return false;
}

async function toPublicPrompt(ctx: QueryCtx | MutationCtx, prompt: Doc<"followUpPrompts">) {
  const targets = await getTargets(ctx, prompt._id);
  const targetRows = await Promise.all(
    targets.map(async (target) => {
      const category = target.categoryId ? await ctx.db.get(target.categoryId) : null;

      return {
        id: target._id,
        targetKind: target.targetKind,
        categoryId: target.categoryId,
        categorySlug: category?.slug,
        categoryName: category?.name,
        categoryColor: category?.color,
        createdAt: target.createdAt,
      };
    }),
  );
  const responses = await ctx.db
    .query("submissions")
    .withIndex("by_follow_up_prompt", (q) => q.eq("followUpPromptId", prompt._id))
    .take(RESPONSE_LIMIT);

  return {
    id: prompt._id,
    sessionId: prompt.sessionId,
    slug: prompt.slug,
    title: prompt.title,
    prompt: prompt.prompt,
    instructions: prompt.instructions,
    targetMode: prompt.targetMode,
    status: prompt.status,
    roundNumber: prompt.roundNumber,
    activatedAt: prompt.activatedAt,
    closedAt: prompt.closedAt,
    createdAt: prompt.createdAt,
    updatedAt: prompt.updatedAt,
    responseCount: responses.length,
    responseCountCapped: responses.length === RESPONSE_LIMIT,
    targets: targetRows,
  };
}

export const create = mutation({
  args: {
    sessionSlug: v.string(),
    title: v.optional(v.string()),
    prompt: v.string(),
    instructions: v.optional(v.string()),
    targetMode: v.union(v.literal("all"), v.literal("categories")),
    categoryIds: v.optional(v.array(v.id("categories"))),
    activateNow: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const prompt = normalizePrompt(args.prompt);
    const title = normalizeTitle(args.title ?? prompt, `Follow-up ${Date.now()}`);
    const categoryIds = args.categoryIds ?? [];

    if (args.targetMode === "categories" && categoryIds.length === 0) {
      throw new Error("Category-targeted follow-ups require at least one category.");
    }

    if (args.targetMode === "all" && categoryIds.length > 0) {
      throw new Error("Class-wide follow-ups should not include category targets.");
    }

    const uniqueCategoryIds = [...new Set(categoryIds)];

    for (const categoryId of uniqueCategoryIds) {
      const category = await ctx.db.get(categoryId);

      if (!category || category.sessionId !== session._id || category.status !== "active") {
        throw new Error("Target category not found in this session.");
      }
    }

    const existingPrompts = await ctx.db
      .query("followUpPrompts")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .take(300);
    const now = Date.now();
    const followUpPromptId = await ctx.db.insert("followUpPrompts", {
      sessionId: session._id,
      slug: await createUniqueSlug(ctx, session._id, title),
      title,
      prompt,
      instructions: normalizeInstructions(args.instructions),
      targetMode: args.targetMode,
      status: args.activateNow ? "active" : "draft",
      roundNumber: existingPrompts.length + 1,
      activatedAt: args.activateNow ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });

    if (args.targetMode === "all") {
      await ctx.db.insert("followUpTargets", {
        sessionId: session._id,
        followUpPromptId,
        targetKind: "all",
        createdAt: now,
      });
    } else {
      for (const categoryId of uniqueCategoryIds) {
        await ctx.db.insert("followUpTargets", {
          sessionId: session._id,
          followUpPromptId,
          targetKind: "category",
          categoryId,
          createdAt: now,
        });
      }
    }

    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      actorType: "instructor",
      action: args.activateNow ? "follow_up.created_active" : "follow_up.created_draft",
      targetType: "followUpPrompt",
      targetId: followUpPromptId,
      metadataJson: { targetMode: args.targetMode, categoryIds: uniqueCategoryIds },
    });

    const followUpPrompt = await ctx.db.get(followUpPromptId);

    if (!followUpPrompt) {
      throw new Error("Follow-up prompt was not created.");
    }

    return await toPublicPrompt(ctx, followUpPrompt);
  },
});

export const setStatus = mutation({
  args: {
    sessionSlug: v.string(),
    followUpPromptId: v.id("followUpPrompts"),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("closed"),
      v.literal("archived"),
    ),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);
    const prompt = await ctx.db.get(args.followUpPromptId);

    if (!session || !prompt || prompt.sessionId !== session._id) {
      throw new Error("Follow-up prompt not found in this session.");
    }

    const now = Date.now();

    await ctx.db.patch(prompt._id, {
      status: args.status,
      activatedAt: args.status === "active" ? (prompt.activatedAt ?? now) : prompt.activatedAt,
      closedAt: args.status === "closed" ? (prompt.closedAt ?? now) : prompt.closedAt,
      updatedAt: now,
    });
    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      actorType: "instructor",
      action: `follow_up.${args.status}`,
      targetType: "followUpPrompt",
      targetId: prompt._id,
      metadataJson: { status: args.status },
    });

    const updated = await ctx.db.get(prompt._id);

    if (!updated) {
      throw new Error("Follow-up prompt not found after update.");
    }

    return await toPublicPrompt(ctx, updated);
  },
});

export const listForSession = query({
  args: {
    sessionSlug: v.string(),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("active"), v.literal("closed"), v.literal("archived")),
    ),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const prompts = args.status
      ? await ctx.db
          .query("followUpPrompts")
          .withIndex("by_session_and_status", (q) =>
            q.eq("sessionId", session._id).eq("status", args.status!),
          )
          .order("desc")
          .take(FOLLOW_UP_LIMIT)
      : await ctx.db
          .query("followUpPrompts")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .order("desc")
          .take(FOLLOW_UP_LIMIT);

    return await Promise.all(prompts.map((prompt) => toPublicPrompt(ctx, prompt)));
  },
});

export const activeForParticipant = query({
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

    const activePrompts = await ctx.db
      .query("followUpPrompts")
      .withIndex("by_session_and_status", (q) =>
        q.eq("sessionId", session._id).eq("status", "active"),
      )
      .order("desc")
      .take(FOLLOW_UP_LIMIT);
    const myResponses = await ctx.db
      .query("submissions")
      .withIndex("by_participant_and_created_at", (q) => q.eq("participantId", participant._id))
      .order("desc")
      .take(100);
    const relevant = [];

    for (const prompt of activePrompts) {
      if (!(await assertParticipantEligible(ctx, prompt, participant._id))) {
        continue;
      }

      relevant.push({
        ...(await toPublicPrompt(ctx, prompt)),
        myResponseCount: myResponses.filter(
          (submission) => submission.followUpPromptId === prompt._id,
        ).length,
      });
    }

    return relevant;
  },
});

export const submitResponse = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    followUpPromptId: v.id("followUpPrompts"),
    body: v.string(),
    parentSubmissionId: v.optional(v.id("submissions")),
    tone: v.optional(toneValidator),
    queueFeedback: v.optional(v.boolean()),
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
  handler: async (ctx, args): Promise<SubmitResponseResult> => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const participant = await getParticipantByClientKey(ctx, session._id, args.clientKey);
    const prompt = await ctx.db.get(args.followUpPromptId);

    if (!participant) {
      throw new Error("Participant not found.");
    }

    if (!prompt || prompt.sessionId !== session._id || prompt.status !== "active") {
      throw new Error("Follow-up prompt is not active in this session.");
    }

    if (!(await assertParticipantEligible(ctx, prompt, participant._id))) {
      throw new Error("This follow-up is not targeted to this participant.");
    }

    const submission: PublicSubmissionResult = await ctx.runMutation(api.submissions.create, {
      sessionSlug: args.sessionSlug,
      clientKey: args.clientKey,
      body: args.body,
      kind: args.parentSubmissionId ? "reply" : "additional_point",
      parentSubmissionId: args.parentSubmissionId,
      followUpPromptId: prompt._id,
      telemetry: args.telemetry,
    });
    const feedback: PublicFeedbackResult | null =
      args.queueFeedback === false
        ? null
        : await ctx.runMutation(api.aiFeedback.enqueueForSubmission, {
            sessionSlug: args.sessionSlug,
            clientKey: args.clientKey,
            submissionId: submission.id,
            tone: args.tone,
          });

    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      actorType: "participant",
      actorParticipantId: participant._id,
      action: "follow_up.response_submitted",
      targetType: "followUpPrompt",
      targetId: prompt._id,
      metadataJson: { submissionId: submission.id },
    });

    return { submission, feedback };
  },
});
