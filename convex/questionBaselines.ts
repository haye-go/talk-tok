import { v } from "convex/values";
import { internal } from "./_generated/api";
import { aiWorkpool, rateLimiter } from "./components";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireInstructorPreviewPassword } from "./previewAuthGuard";
import { resolveQuestionForRead, resolveQuestionIdForWrite } from "./questionScope";

type JsonRecord = Record<string, unknown>;

const BASELINE_LIMIT = 80;
const PROMPT_KEY = "question.baseline.v1";

function normalizeSessionSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function stringOrFallback(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

async function getSessionBySlug(ctx: QueryCtx | MutationCtx, sessionSlug: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_slug", (q) => q.eq("slug", normalizeSessionSlug(sessionSlug)))
    .unique();
}

function toPublicBaseline(baseline: Doc<"questionBaselines">) {
  return {
    id: baseline._id,
    sessionId: baseline.sessionId,
    questionId: baseline.questionId,
    status: baseline.status,
    promptTemplateKey: baseline.promptTemplateKey,
    provider: baseline.provider,
    model: baseline.model,
    baselineText: baseline.baselineText,
    summary: baseline.summary,
    generatedAt: baseline.generatedAt,
    error: baseline.error,
    createdAt: baseline.createdAt,
    updatedAt: baseline.updatedAt,
  };
}

async function latestBaselineForQuestion(
  ctx: QueryCtx | MutationCtx,
  questionId: Id<"sessionQuestions">,
) {
  return await ctx.db
    .query("questionBaselines")
    .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
    .order("desc")
    .take(1)
    .then((rows) => rows[0] ?? null);
}

export const listForSession = query({
  args: {
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    if (args.questionId) {
      const questionId = args.questionId;
      const question = await ctx.db.get(questionId);

      if (!question || question.sessionId !== session._id) {
        throw new Error("Question not found in this session.");
      }

      const rows = await ctx.db
        .query("questionBaselines")
        .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
        .order("desc")
        .take(BASELINE_LIMIT);

      return rows.map(toPublicBaseline);
    }

    const rows = await ctx.db
      .query("questionBaselines")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .order("desc")
      .take(BASELINE_LIMIT);

    return rows.map(toPublicBaseline);
  },
});

export const getForQuestion = query({
  args: {
    previewPassword: v.string(),
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const question = await resolveQuestionForRead(ctx, session, args.questionId);

    if (!question) {
      return null;
    }

    const baseline = await latestBaselineForQuestion(ctx, question._id);

    return baseline ? toPublicBaseline(baseline) : null;
  },
});

export const generateForQuestion = mutation({
  args: {
    previewPassword: v.string(),
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
    forceRegenerate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const questionId = await resolveQuestionIdForWrite(ctx, session, args.questionId);
    const question = await ctx.db.get(questionId);

    if (!question || question.status !== "released") {
      throw new Error("Baselines can only be generated for released questions.");
    }

    await rateLimiter.limit(ctx, "heavyAiAction", {
      key: `question-baseline:${questionId}`,
      throws: true,
    });
    const budget = await ctx.runQuery(internal.budget.checkSessionBudget, {
      sessionId: session._id,
      feature: "question_baseline",
    });

    if (!budget.allowed) {
      throw new Error("AI budget hard stop is active for this session.");
    }

    const existing = await latestBaselineForQuestion(ctx, questionId);

    if (existing && existing.status !== "error" && !args.forceRegenerate) {
      return toPublicBaseline(existing);
    }

    const now = Date.now();
    const baselineId =
      existing?._id ??
      (await ctx.db.insert("questionBaselines", {
        sessionId: session._id,
        questionId,
        status: "queued",
        promptTemplateKey: PROMPT_KEY,
        createdAt: now,
        updatedAt: now,
      }));

    await ctx.db.patch(baselineId, {
      status: "queued",
      promptTemplateKey: PROMPT_KEY,
      error: undefined,
      updatedAt: now,
    });

    const jobId = await ctx.db.insert("aiJobs", {
      sessionId: session._id,
      questionId,
      type: "question_baseline",
      status: "queued",
      requestedBy: "instructor",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      questionId,
      actorType: "instructor",
      action: "question_baseline.queued",
      targetType: "questionBaseline",
      targetId: baselineId,
      metadataJson: { jobId },
    });

    await aiWorkpool.enqueueAction(
      ctx,
      internal.questionBaselines.generateBaseline,
      { baselineId, jobId },
      { name: "questionBaselines.generateBaseline", retry: true },
    );

    return toPublicBaseline((await ctx.db.get(baselineId))!);
  },
});

export const loadBaselineContext = internalQuery({
  args: {
    baselineId: v.id("questionBaselines"),
  },
  handler: async (ctx, args) => {
    const baseline = await ctx.db.get(args.baselineId);

    if (!baseline) {
      throw new Error("Question baseline not found.");
    }

    const [session, question] = await Promise.all([
      ctx.db.get(baseline.sessionId),
      ctx.db.get(baseline.questionId),
    ]);

    if (!session || !question || question.sessionId !== session._id) {
      throw new Error("Question baseline context is incomplete.");
    }

    return { baseline, session, question };
  },
});

export const markProcessing = internalMutation({
  args: {
    baselineId: v.id("questionBaselines"),
    jobId: v.id("aiJobs"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.baselineId, { status: "processing", updatedAt: now });
    await ctx.db.patch(args.jobId, { status: "processing", updatedAt: now });
  },
});

export const markReady = internalMutation({
  args: {
    baselineId: v.id("questionBaselines"),
    jobId: v.id("aiJobs"),
    baselineText: v.string(),
    summary: v.string(),
    llmCallId: v.id("llmCalls"),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.llmCallId);
    const now = Date.now();

    await ctx.db.patch(args.baselineId, {
      status: "ready",
      provider: call?.provider,
      model: call?.model,
      baselineText: args.baselineText,
      summary: args.summary,
      generatedAt: now,
      error: undefined,
      updatedAt: now,
    });
    await ctx.db.patch(args.jobId, {
      status: "success",
      progressDone: 1,
      progressTotal: 1,
      updatedAt: now,
    });
  },
});

export const markError = internalMutation({
  args: {
    baselineId: v.id("questionBaselines"),
    jobId: v.id("aiJobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.baselineId, { status: "error", error: args.error, updatedAt: now });
    await ctx.db.patch(args.jobId, { status: "error", error: args.error, updatedAt: now });
  },
});

export const generateBaseline = internalAction({
  args: {
    baselineId: v.id("questionBaselines"),
    jobId: v.id("aiJobs"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.questionBaselines.markProcessing, args);

    try {
      const { session, question } = await ctx.runQuery(
        internal.questionBaselines.loadBaselineContext,
        { baselineId: args.baselineId },
      );
      const result = await ctx.runAction(internal.llm.runJson, {
        sessionId: session._id,
        questionId: question._id,
        feature: "question_baseline",
        promptKey: PROMPT_KEY,
        variables: {
          sessionTitle: session.title,
          questionTitle: question.title,
          questionPrompt: question.prompt,
        },
      });
      const data = asRecord(result.data);

      await ctx.runMutation(internal.questionBaselines.markReady, {
        baselineId: args.baselineId,
        jobId: args.jobId,
        baselineText: stringOrFallback(data.baselineText, ""),
        summary: stringOrFallback(data.summary, ""),
        llmCallId: result.llmCallId,
      });
    } catch (error) {
      await ctx.runMutation(internal.questionBaselines.markError, {
        baselineId: args.baselineId,
        jobId: args.jobId,
        error: error instanceof Error ? error.message : "Question baseline generation failed.",
      });
      throw error;
    }
  },
});
