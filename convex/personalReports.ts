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
import { aiWorkpool, rateLimiter } from "./components";
import { requireInstructorPreviewPassword } from "./previewAuthGuard";
import { resolveQuestionForRead, resolveQuestionIdForWrite } from "./questionScope";

type JsonRecord = Record<string, unknown>;

const REPORT_PARTICIPANT_LIMIT = 220;
const REPORT_SUBMISSION_LIMIT = 80;
const REPORT_LIMIT = 220;
const ARTIFACT_CONTEXT_LIMIT = 30;

const participationBandValidator = v.union(
  v.literal("quiet"),
  v.literal("active"),
  v.literal("highly_active"),
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
const responsivenessBandValidator = v.union(
  v.literal("limited"),
  v.literal("responsive"),
  v.literal("highly_responsive"),
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

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function stringOrFallback(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function bandOrDefault<T extends string>(value: unknown, allowed: readonly T[], fallback: T) {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
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

function toReport(report: Doc<"personalReports">) {
  return {
    id: report._id,
    sessionId: report.sessionId,
    participantId: report.participantId,
    status: report.status,
    participationBand: report.participationBand,
    reasoningBand: report.reasoningBand,
    originalityBand: report.originalityBand,
    responsivenessBand: report.responsivenessBand,
    summary: report.summary,
    contributionTrace: report.contributionTrace,
    argumentEvolution: report.argumentEvolution,
    growthOpportunity: report.growthOpportunity,
    citedArtifactIds: report.citedArtifactIds,
    promptTemplateKey: report.promptTemplateKey,
    llmCallId: report.llmCallId,
    aiJobId: report.aiJobId,
    error: report.error,
    generatedAt: report.generatedAt,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

async function latestReport(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"sessions">,
  participantId: Id<"participants">,
) {
  return await ctx.db
    .query("personalReports")
    .withIndex("by_session_and_participant", (q) =>
      q.eq("sessionId", sessionId).eq("participantId", participantId),
    )
    .order("desc")
    .take(1)
    .then((rows) => rows[0] ?? null);
}

async function queueReport(
  ctx: MutationCtx,
  args: {
    sessionId: Id<"sessions">;
    questionId?: Id<"sessionQuestions">;
    participantId: Id<"participants">;
    requestedBy: "participant" | "instructor" | "system";
    forceRegenerate?: boolean;
  },
) {
  const existing = await latestReport(ctx, args.sessionId, args.participantId);

  if (existing && existing.status !== "error" && !args.forceRegenerate) {
    return existing;
  }

  const now = Date.now();
  const reportId =
    existing?._id ??
    (await ctx.db.insert("personalReports", {
      sessionId: args.sessionId,
      participantId: args.participantId,
      status: "queued",
      citedArtifactIds: [],
      createdAt: now,
      updatedAt: now,
    }));
  const jobId = await ctx.db.insert("aiJobs", {
    sessionId: args.sessionId,
    questionId: args.questionId,
    type: "personal_report",
    status: "queued",
    requestedBy: args.requestedBy,
    createdAt: now,
    updatedAt: now,
  });

  if (existing) {
    await ctx.db.patch(existing._id, {
      status: "queued",
      aiJobId: jobId,
      error: undefined,
      updatedAt: now,
    });
  } else {
    await ctx.db.patch(reportId, { aiJobId: jobId });
  }

  await aiWorkpool.enqueueAction(
    ctx,
    internal.personalReports.generateReport,
    { reportId, jobId },
    { name: "personalReports.generateReport", retry: true },
  );

  return (await ctx.db.get(reportId))!;
}

export const generateMine = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    forceRegenerate: v.optional(v.boolean()),
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

    await rateLimiter.limit(ctx, "heavyAiAction", {
      key: `personal_report:${session._id}:${participant._id}`,
      throws: true,
    });
    const budget = await ctx.runQuery(internal.budget.checkSessionBudget, {
      sessionId: session._id,
      feature: "personal_report",
    });

    if (!budget.allowed) {
      throw new Error("AI budget hard stop is active for this session.");
    }

    const questionId = await resolveQuestionIdForWrite(ctx, session);
    const report = await queueReport(ctx, {
      sessionId: session._id,
      questionId,
      participantId: participant._id,
      requestedBy: "participant",
      forceRegenerate: args.forceRegenerate,
    });

    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      questionId,
      actorType: "participant",
      actorParticipantId: participant._id,
      action: "personal_report.queued",
      targetType: "personalReport",
      targetId: report._id,
    });

    return toReport(report);
  },
});

export const generateForSession = mutation({
  args: {
    previewPassword: v.string(),
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
    participantIds: v.optional(v.array(v.id("participants"))),
    forceRegenerate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    await rateLimiter.limit(ctx, "heavyAiAction", {
      key: `personal_report_batch:${session._id}`,
      throws: true,
    });
    const budget = await ctx.runQuery(internal.budget.checkSessionBudget, {
      sessionId: session._id,
      feature: "personal_report",
    });

    if (!budget.allowed) {
      throw new Error("AI budget hard stop is active for this session.");
    }

    const participants = args.participantIds
      ? await Promise.all(args.participantIds.map((participantId) => ctx.db.get(participantId)))
      : await ctx.db
          .query("participants")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .take(REPORT_PARTICIPANT_LIMIT);
    const reports = [];
    const questionId = await resolveQuestionIdForWrite(ctx, session, args.questionId);

    for (const participant of participants) {
      if (
        !participant ||
        participant.sessionId !== session._id ||
        participant.role !== "participant"
      ) {
        continue;
      }

      reports.push(
        toReport(
          await queueReport(ctx, {
            sessionId: session._id,
            questionId,
            participantId: participant._id,
            requestedBy: "instructor",
            forceRegenerate: args.forceRegenerate,
          }),
        ),
      );
    }

    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      questionId,
      actorType: "instructor",
      action: "personal_report.batch_queued",
      targetType: "personalReports",
      metadataJson: { count: reports.length },
    });

    return {
      queued: reports.length,
      capped: !args.participantIds && reports.length === REPORT_PARTICIPANT_LIMIT,
      reports,
    };
  },
});

export const getMine = query({
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

    const report = await latestReport(ctx, session._id, participant._id);

    return report ? toReport(report) : null;
  },
});

export const listForSession = query({
  args: {
    sessionSlug: v.string(),
    status: v.optional(
      v.union(
        v.literal("queued"),
        v.literal("processing"),
        v.literal("success"),
        v.literal("error"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const reports = args.status
      ? await ctx.db
          .query("personalReports")
          .withIndex("by_session_and_status", (q) =>
            q.eq("sessionId", session._id).eq("status", args.status!),
          )
          .order("desc")
          .take(REPORT_LIMIT)
      : await ctx.db
          .query("personalReports")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .order("desc")
          .take(REPORT_LIMIT);

    return reports.map(toReport);
  },
});

export const loadReportContext = internalQuery({
  args: {
    reportId: v.id("personalReports"),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);

    if (!report) {
      throw new Error("Personal report not found.");
    }

    const [session, participant] = await Promise.all([
      ctx.db.get(report.sessionId),
      ctx.db.get(report.participantId),
    ]);

    if (!session || !participant) {
      throw new Error("Personal report context is incomplete.");
    }

    const question = await resolveQuestionForRead(ctx, session);
    const submissions = question
      ? await ctx.db
          .query("submissions")
          .withIndex("by_participant_and_questionId", (q) =>
            q.eq("participantId", participant._id).eq("questionId", question._id),
          )
          .order("asc")
          .take(REPORT_SUBMISSION_LIMIT)
      : await ctx.db
          .query("submissions")
          .withIndex("by_participant_and_created_at", (q) => q.eq("participantId", participant._id))
          .order("asc")
          .take(REPORT_SUBMISSION_LIMIT);
    const submissionIds = new Set(submissions.map((submission) => submission._id));
    const feedbackRows = await ctx.db
      .query("submissionFeedback")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .order("desc")
      .take(REPORT_SUBMISSION_LIMIT);
    const feedback = feedbackRows.filter((row) => submissionIds.has(row.submissionId));
    const assignments = [];

    for (const submission of submissions) {
      const assignment = await ctx.db
        .query("submissionCategories")
        .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
        .order("desc")
        .take(8)
        .then(
          (rows) =>
            rows.find((row) => !question || !row.questionId || row.questionId === question._id) ??
            null,
        );

      if (!assignment) {
        continue;
      }

      const category = await ctx.db.get(assignment.categoryId);
      assignments.push({
        submissionId: submission._id,
        categoryId: assignment.categoryId,
        categoryName: category?.name,
        categorySlug: category?.slug,
        confidence: assignment.confidence,
        rationale: assignment.rationale,
        status: assignment.status,
      });
    }

    const baseline = question
      ? await ctx.db
          .query("questionBaselines")
          .withIndex("by_questionId_and_status", (q) =>
            q.eq("questionId", question._id).eq("status", "ready"),
          )
          .order("desc")
          .take(1)
          .then((rows) => rows[0] ?? null)
      : null;
    const [attackingThreads, defendingThreads, publishedArtifacts, finalArtifacts] =
      await Promise.all([
        ctx.db
          .query("fightThreads")
          .withIndex("by_attacker", (q) => q.eq("attackerParticipantId", participant._id))
          .order("desc")
          .take(30),
        ctx.db
          .query("fightThreads")
          .withIndex("by_defender", (q) => q.eq("defenderParticipantId", participant._id))
          .order("desc")
          .take(30),
        question
          ? ctx.db
              .query("synthesisArtifacts")
              .withIndex("by_questionId_and_status", (q) =>
                q.eq("questionId", question._id).eq("status", "published"),
              )
              .order("desc")
              .take(ARTIFACT_CONTEXT_LIMIT)
          : ctx.db
              .query("synthesisArtifacts")
              .withIndex("by_session_and_status", (q) =>
                q.eq("sessionId", session._id).eq("status", "published"),
              )
              .order("desc")
              .take(ARTIFACT_CONTEXT_LIMIT),
        question
          ? ctx.db
              .query("synthesisArtifacts")
              .withIndex("by_questionId_and_status", (q) =>
                q.eq("questionId", question._id).eq("status", "final"),
              )
              .order("desc")
              .take(ARTIFACT_CONTEXT_LIMIT)
          : ctx.db
              .query("synthesisArtifacts")
              .withIndex("by_session_and_status", (q) =>
                q.eq("sessionId", session._id).eq("status", "final"),
              )
              .order("desc")
              .take(ARTIFACT_CONTEXT_LIMIT),
      ]);
    const threadIds = new Set(
      [...attackingThreads, ...defendingThreads]
        .filter((thread) => thread.sessionId === session._id)
        .map((thread) => thread._id),
    );
    const fightDebriefs = [];

    for (const threadId of threadIds) {
      const debrief = await ctx.db
        .query("fightDebriefs")
        .withIndex("by_thread", (q) => q.eq("fightThreadId", threadId))
        .order("desc")
        .take(1)
        .then((rows) => rows[0] ?? null);

      if (debrief) {
        fightDebriefs.push(debrief);
      }
    }

    return {
      report,
      session,
      question,
      participant,
      baseline,
      submissions,
      feedback,
      assignments,
      fightDebriefs,
      artifacts: [...publishedArtifacts, ...finalArtifacts].slice(0, ARTIFACT_CONTEXT_LIMIT),
    };
  },
});

export const markReportProcessing = internalMutation({
  args: {
    reportId: v.id("personalReports"),
    jobId: v.id("aiJobs"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.reportId, { status: "processing", updatedAt: now });
    await ctx.db.patch(args.jobId, { status: "processing", updatedAt: now });
  },
});

export const markReportSuccess = internalMutation({
  args: {
    reportId: v.id("personalReports"),
    jobId: v.id("aiJobs"),
    participationBand: participationBandValidator,
    reasoningBand: reasoningBandValidator,
    originalityBand: originalityBandValidator,
    responsivenessBand: responsivenessBandValidator,
    summary: v.string(),
    contributionTrace: v.string(),
    argumentEvolution: v.string(),
    growthOpportunity: v.string(),
    citedArtifactIds: v.array(v.id("synthesisArtifacts")),
    promptTemplateKey: v.string(),
    llmCallId: v.id("llmCalls"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.reportId, {
      status: "success",
      participationBand: args.participationBand,
      reasoningBand: args.reasoningBand,
      originalityBand: args.originalityBand,
      responsivenessBand: args.responsivenessBand,
      summary: args.summary,
      contributionTrace: args.contributionTrace,
      argumentEvolution: args.argumentEvolution,
      growthOpportunity: args.growthOpportunity,
      citedArtifactIds: args.citedArtifactIds,
      promptTemplateKey: args.promptTemplateKey,
      llmCallId: args.llmCallId,
      error: undefined,
      generatedAt: now,
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

export const markReportError = internalMutation({
  args: {
    reportId: v.id("personalReports"),
    jobId: v.id("aiJobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.reportId, { status: "error", error: args.error, updatedAt: now });
    await ctx.db.patch(args.jobId, { status: "error", error: args.error, updatedAt: now });
  },
});

export const generateReport = internalAction({
  args: {
    reportId: v.id("personalReports"),
    jobId: v.id("aiJobs"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.personalReports.markReportProcessing, args);

    try {
      const {
        session,
        question,
        participant,
        baseline,
        submissions,
        feedback,
        assignments,
        fightDebriefs,
        artifacts,
      } = await ctx.runQuery(internal.personalReports.loadReportContext, {
        reportId: args.reportId,
      });
      const result = await ctx.runAction(internal.llm.runJson, {
        sessionId: session._id,
        questionId: question?._id,
        feature: "personal_report",
        promptKey: "report.personal.v1",
        variables: {
          sessionTitle: session.title,
          openingPrompt: question?.prompt ?? session.openingPrompt,
          questionJson: JSON.stringify(
            question
              ? {
                  id: question._id,
                  title: question.title,
                  prompt: question.prompt,
                  status: question.status,
                  isCurrent: question.isCurrent,
                }
              : null,
          ),
          baselineJson: JSON.stringify(
            baseline
              ? {
                  id: baseline._id,
                  baselineText: baseline.baselineText,
                  summary: baseline.summary,
                  generatedAt: baseline.generatedAt,
                }
              : null,
          ),
          participantJson: JSON.stringify({
            id: participant._id,
            nickname: participant.nickname,
            participantSlug: participant.participantSlug,
          }),
          submissionsJson: JSON.stringify(
            submissions.map((submission) => ({
              id: submission._id,
              body: submission.body,
              kind: submission.kind,
              wordCount: submission.wordCount,
              inputPattern: submission.inputPattern,
              compositionMs: submission.compositionMs,
              pasteEventCount: submission.pasteEventCount,
              createdAt: submission.createdAt,
            })),
          ),
          feedbackJson: JSON.stringify(
            feedback.map((row) => ({
              submissionId: row.submissionId,
              status: row.status,
              reasoningBand: row.reasoningBand,
              originalityBand: row.originalityBand,
              specificityBand: row.specificityBand,
              summary: row.summary,
            })),
          ),
          assignmentsJson: JSON.stringify(assignments),
          fightDebriefsJson: JSON.stringify(
            fightDebriefs.map((row) => ({
              status: row.status,
              summary: row.summary,
              attackerStrength: row.attackerStrength,
              defenderStrength: row.defenderStrength,
              strongerRebuttal: row.strongerRebuttal,
              nextPractice: row.nextPractice,
            })),
          ),
          artifactsJson: JSON.stringify(
            artifacts.map((artifact) => ({
              id: artifact._id,
              kind: artifact.kind,
              title: artifact.title,
              summary: artifact.summary,
              keyPoints: artifact.keyPoints,
            })),
          ),
        },
      });
      const data = asRecord(result.data);

      await ctx.runMutation(internal.personalReports.markReportSuccess, {
        reportId: args.reportId,
        jobId: args.jobId,
        participationBand: bandOrDefault(
          data.participationBand,
          ["quiet", "active", "highly_active"] as const,
          "active",
        ),
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
        responsivenessBand: bandOrDefault(
          data.responsivenessBand,
          ["limited", "responsive", "highly_responsive"] as const,
          "responsive",
        ),
        summary: stringOrFallback(data.summary, "Your discussion report is ready."),
        contributionTrace: stringOrFallback(
          data.contributionTrace,
          "Your contributions were included in the session discussion record.",
        ),
        argumentEvolution: stringOrFallback(
          data.argumentEvolution,
          "Your argument evolution will become clearer as more follow-ups are added.",
        ),
        growthOpportunity: stringOrFallback(
          data.growthOpportunity,
          "Try engaging directly with an opposing view in the next round.",
        ),
        citedArtifactIds: artifacts.slice(0, 8).map((artifact) => artifact._id),
        promptTemplateKey: "report.personal.v1",
        llmCallId: result.llmCallId,
      });
    } catch (error) {
      await ctx.runMutation(internal.personalReports.markReportError, {
        reportId: args.reportId,
        jobId: args.jobId,
        error: error instanceof Error ? error.message : "Personal report generation failed.",
      });
      throw error;
    }
  },
});
