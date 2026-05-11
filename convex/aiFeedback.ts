import { v } from "convex/values";
import { internal } from "./_generated/api";
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

type JsonRecord = Record<string, unknown>;

const toneValidator = v.union(
  v.literal("gentle"),
  v.literal("direct"),
  v.literal("spicy"),
  v.literal("roast"),
);
const reasoningBandValidator = v.union(
  v.literal("emerging"),
  v.literal("solid"),
  v.literal("strong"),
  v.literal("exceptional"),
);
const originalityBandValidator = v.union(
  v.literal("common"),
  v.literal("above_average"),
  v.literal("distinctive"),
  v.literal("novel"),
);
const specificityBandValidator = v.union(
  v.literal("basic"),
  v.literal("clear"),
  v.literal("detailed"),
  v.literal("nuanced"),
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

function toPublicFeedback(feedback: Doc<"submissionFeedback">) {
  return {
    id: feedback._id,
    submissionId: feedback.submissionId,
    participantId: feedback.participantId,
    status: feedback.status,
    tone: feedback.tone,
    reasoningBand: feedback.reasoningBand,
    originalityBand: feedback.originalityBand,
    specificityBand: feedback.specificityBand,
    summary: feedback.summary,
    strengths: feedback.strengths,
    improvement: feedback.improvement,
    nextQuestion: feedback.nextQuestion,
    error: feedback.error,
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
  };
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

function bandOrDefault<T extends string>(value: unknown, allowed: readonly T[], fallback: T) {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function formatInputTelemetry(submission: Doc<"submissions">) {
  return JSON.stringify({
    inputPattern: submission.inputPattern,
    compositionMs: submission.compositionMs,
    pasteEventCount: submission.pasteEventCount,
    keystrokeCount: submission.keystrokeCount,
  });
}

export const enqueueForSubmission = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    submissionId: v.id("submissions"),
    tone: v.optional(toneValidator),
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

    const submission = await ctx.db.get(args.submissionId);

    if (
      !submission ||
      submission.sessionId !== session._id ||
      submission.participantId !== participant._id
    ) {
      throw new Error("Submission not found for this participant.");
    }

    const existing = await ctx.db
      .query("submissionFeedback")
      .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
      .order("desc")
      .take(1)
      .then((rows) => rows[0]);

    if (existing && existing.status !== "error") {
      return toPublicFeedback(existing);
    }

    const now = Date.now();
    const isRetry = Boolean(existing && existing.status === "error");
    const tone = args.tone ?? session.critiqueToneDefault;
    const questionId = submission.questionId;
    const feedbackId =
      existing?._id ??
      (await ctx.db.insert("submissionFeedback", {
        sessionId: session._id,
        submissionId: submission._id,
        participantId: participant._id,
        status: "queued",
        tone,
        createdAt: now,
        updatedAt: now,
      }));

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "queued",
        tone,
        error: undefined,
        updatedAt: now,
      });
    }

    const jobId = await ctx.db.insert("aiJobs", {
      sessionId: session._id,
      questionId,
      submissionId: submission._id,
      type: "feedback",
      status: "queued",
      requestedBy: "participant",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      questionId,
      actorType: "participant",
      actorParticipantId: participant._id,
      action: isRetry ? "feedback.retry_queued" : "feedback.queued",
      targetType: "submissionFeedback",
      targetId: feedbackId,
      metadataJson: { submissionId: submission._id, jobId, tone },
    });

    await ctx.scheduler.runAfter(0, internal.aiFeedback.generateForFeedback, {
      feedbackId,
      jobId,
    });

    const feedback = await ctx.db.get(feedbackId);

    if (!feedback) {
      throw new Error("Feedback was not queued.");
    }

    return toPublicFeedback(feedback);
  },
});

export const retryFailed = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    submissionId: v.id("submissions"),
    tone: v.optional(toneValidator),
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

    const feedback = await ctx.db
      .query("submissionFeedback")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .order("desc")
      .take(1)
      .then((rows) => rows[0]);

    if (!feedback || feedback.participantId !== participant._id || feedback.status !== "error") {
      throw new Error("No failed feedback was found for this submission.");
    }

    const now = Date.now();
    const submission = await ctx.db.get(args.submissionId);
    const questionId = submission?.questionId;
    await ctx.db.patch(feedback._id, {
      status: "queued",
      tone: args.tone ?? feedback.tone,
      error: undefined,
      updatedAt: now,
    });

    const jobId = await ctx.db.insert("aiJobs", {
      sessionId: session._id,
      questionId,
      submissionId: args.submissionId,
      type: "feedback",
      status: "queued",
      requestedBy: "participant",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      questionId,
      actorType: "participant",
      actorParticipantId: participant._id,
      action: "feedback.retry_queued",
      targetType: "submissionFeedback",
      targetId: feedback._id,
      metadataJson: { submissionId: args.submissionId, jobId },
    });
    await ctx.scheduler.runAfter(0, internal.aiFeedback.generateForFeedback, {
      feedbackId: feedback._id,
      jobId,
    });

    return toPublicFeedback((await ctx.db.get(feedback._id))!);
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

    const feedback = await ctx.db
      .query("submissionFeedback")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .order("desc")
      .take(40);

    return feedback.map(toPublicFeedback);
  },
});

export const loadFeedbackContext = internalQuery({
  args: {
    feedbackId: v.id("submissionFeedback"),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);

    if (!feedback) {
      throw new Error("Feedback not found.");
    }

    const [session, submission] = await Promise.all([
      ctx.db.get(feedback.sessionId),
      ctx.db.get(feedback.submissionId),
    ]);

    if (!session || !submission) {
      throw new Error("Feedback context is incomplete.");
    }

    const questionId = submission.questionId;
    const question = questionId ? await ctx.db.get(questionId) : null;
    const baseline =
      questionId && question?.sessionId === session._id
        ? await ctx.db
            .query("questionBaselines")
            .withIndex("by_questionId_and_status", (q) =>
              q.eq("questionId", questionId).eq("status", "ready"),
            )
            .order("desc")
            .take(1)
            .then((rows) => rows[0] ?? null)
        : null;

    return { feedback, session, submission, question, baseline };
  },
});

export const markProcessing = internalMutation({
  args: {
    feedbackId: v.id("submissionFeedback"),
    jobId: v.id("aiJobs"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.feedbackId, { status: "processing", updatedAt: now });
    await ctx.db.patch(args.jobId, { status: "processing", updatedAt: now });
  },
});

export const markSuccess = internalMutation({
  args: {
    feedbackId: v.id("submissionFeedback"),
    jobId: v.id("aiJobs"),
    reasoningBand: reasoningBandValidator,
    originalityBand: originalityBandValidator,
    specificityBand: specificityBandValidator,
    summary: v.string(),
    strengths: v.string(),
    improvement: v.string(),
    nextQuestion: v.string(),
    llmCallId: v.id("llmCalls"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.feedbackId, {
      status: "success",
      reasoningBand: args.reasoningBand,
      originalityBand: args.originalityBand,
      specificityBand: args.specificityBand,
      summary: args.summary,
      strengths: args.strengths,
      improvement: args.improvement,
      nextQuestion: args.nextQuestion,
      llmCallId: args.llmCallId,
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
    feedbackId: v.id("submissionFeedback"),
    jobId: v.id("aiJobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.feedbackId, {
      status: "error",
      error: args.error,
      updatedAt: now,
    });
    await ctx.db.patch(args.jobId, {
      status: "error",
      error: args.error,
      updatedAt: now,
    });
  },
});

export const generateForFeedback = internalAction({
  args: {
    feedbackId: v.id("submissionFeedback"),
    jobId: v.id("aiJobs"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.aiFeedback.markProcessing, args);

    try {
      const { feedback, session, submission, question, baseline } = await ctx.runQuery(
        internal.aiFeedback.loadFeedbackContext,
        { feedbackId: args.feedbackId },
      );
      const result = await ctx.runAction(internal.llm.runJson, {
        sessionId: session._id,
        questionId: submission.questionId,
        feature: "feedback",
        promptKey: "feedback.private.v1",
        variables: {
          sessionTitle: session.title,
          openingPrompt: question?.prompt ?? session.openingPrompt,
          baselineJson: JSON.stringify(
            baseline
              ? {
                  summary: baseline.summary,
                  baselineText: baseline.baselineText,
                }
              : null,
          ),
          tone: feedback.tone,
          wordCount: submission.wordCount,
          inputTelemetry: formatInputTelemetry(submission),
          submissionBody: submission.body,
        },
      });
      const data = asRecord(result.data);

      await ctx.runMutation(internal.aiFeedback.markSuccess, {
        feedbackId: args.feedbackId,
        jobId: args.jobId,
        reasoningBand: bandOrDefault(
          data.reasoningBand,
          ["emerging", "solid", "strong", "exceptional"] as const,
          "solid",
        ),
        originalityBand: bandOrDefault(
          data.originalityBand,
          ["common", "above_average", "distinctive", "novel"] as const,
          "above_average",
        ),
        specificityBand: bandOrDefault(
          data.specificityBand,
          ["basic", "clear", "detailed", "nuanced"] as const,
          "clear",
        ),
        summary: stringOrEmpty(data.summary),
        strengths: stringOrEmpty(data.strengths),
        improvement: stringOrEmpty(data.improvement),
        nextQuestion: stringOrEmpty(data.nextQuestion),
        llmCallId: result.llmCallId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Feedback generation failed.";
      await ctx.runMutation(internal.aiFeedback.markError, {
        feedbackId: args.feedbackId,
        jobId: args.jobId,
        error: message,
      });
      throw error;
    }
  },
});
