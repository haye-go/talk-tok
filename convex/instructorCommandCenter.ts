import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  getCurrentQuestionForSession,
  listQuestionsForSession,
  toPublicQuestion,
} from "./sessionQuestions";

const PARTICIPANT_LIMIT = 300;
const SUBMISSION_LIMIT = 240;
const CATEGORY_LIMIT = 100;
const JOB_LIMIT = 80;
const AUDIT_LIMIT = 50;
const ROOM_SUBMISSION_LIMIT = 200;
const ROOM_REACTION_LIMIT = 800;
const FOLLOW_UP_LIMIT = 30;
const FIGHT_THREAD_LIMIT = 60;
const SYNTHESIS_ARTIFACT_LIMIT = 80;
const PERSONAL_REPORT_LIMIT = 220;
const SEMANTIC_ROW_LIMIT = 240;
const OFFLINE_AFTER_MS = 60_000;

type PresenceState = "typing" | "submitted" | "idle" | "offline";
type InputPattern = "composed_gradually" | "likely_pasted" | "mixed" | "unknown";
type JobStatus = "queued" | "processing" | "success" | "error";
type ArtifactStatus =
  | "queued"
  | "processing"
  | "draft"
  | "published"
  | "final"
  | "error"
  | "archived";

function normalizeSessionSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function getSessionBySlug(ctx: QueryCtx, sessionSlug: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_slug", (q) => q.eq("slug", normalizeSessionSlug(sessionSlug)))
    .unique();
}

function toSessionSnapshot(session: Doc<"sessions">, participantCount: number) {
  return {
    id: session._id,
    slug: session.slug,
    joinCode: session.joinCode,
    title: session.title,
    openingPrompt: session.openingPrompt,
    currentQuestionId: session.currentQuestionId,
    modePreset: session.modePreset,
    phase: session.phase,
    currentAct: session.currentAct,
    visibilityMode: session.visibilityMode,
    anonymityMode: session.anonymityMode,
    responseSoftLimitWords: session.responseSoftLimitWords,
    categorySoftCap: session.categorySoftCap,
    critiqueToneDefault: session.critiqueToneDefault,
    telemetryEnabled: session.telemetryEnabled,
    fightMeEnabled: session.fightMeEnabled,
    summaryGateEnabled: session.summaryGateEnabled,
    participantCount,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function toAuditEvent(event: Doc<"auditEvents">) {
  return {
    id: event._id,
    actorType: event.actorType,
    actorParticipantId: event.actorParticipantId,
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId,
    metadataJson: event.metadataJson,
    createdAt: event.createdAt,
  };
}

function toJob(job: Doc<"aiJobs">) {
  return {
    id: job._id,
    submissionId: job.submissionId,
    type: job.type,
    status: job.status,
    requestedBy: job.requestedBy,
    progressTotal: job.progressTotal,
    progressDone: job.progressDone,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function emptyStatusCounts(): Record<JobStatus, number> {
  return {
    queued: 0,
    processing: 0,
    success: 0,
    error: 0,
  };
}

function emptyArtifactStatusCounts(): Record<ArtifactStatus, number> {
  return {
    queued: 0,
    processing: 0,
    draft: 0,
    published: 0,
    final: 0,
    error: 0,
    archived: 0,
  };
}

function emptyReactionCounts() {
  return {
    agree: 0,
    sharp: 0,
    question: 0,
    spark: 0,
    changed_mind: 0,
  };
}

function toSubmission(
  submission: Doc<"submissions">,
  participant: Doc<"participants"> | null,
  assignment: {
    questionId?: Id<"sessionQuestions">;
    categoryId: Id<"categories">;
    categoryName?: string;
    categorySlug?: string;
    categoryStatus?: "active" | "archived";
  } | null,
) {
  return {
    id: submission._id,
    questionId: submission.questionId,
    participantId: submission.participantId,
    participantSlug: participant?.participantSlug ?? "unknown",
    nickname: participant?.nickname ?? "Unknown",
    body: submission.body,
    parentSubmissionId: submission.parentSubmissionId,
    followUpPromptId: submission.followUpPromptId,
    kind: submission.kind,
    wordCount: submission.wordCount,
    compositionMs: submission.compositionMs,
    pasteEventCount: submission.pasteEventCount,
    keystrokeCount: submission.keystrokeCount,
    inputPattern: submission.inputPattern,
    categoryId: assignment?.categoryId,
    assignmentQuestionId: assignment?.questionId,
    categoryName: assignment?.categoryName,
    categorySlug: assignment?.categorySlug,
    categoryStatus: assignment?.categoryStatus,
    createdAt: submission.createdAt,
  };
}

function isTopLevelMessage(submission: Doc<"submissions">) {
  return (
    !submission.parentSubmissionId &&
    !submission.followUpPromptId &&
    (submission.kind === "initial" || submission.kind === "additional_point")
  );
}

export const room = query({
  args: {
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const [questions, currentQuestion] = await Promise.all([
      listQuestionsForSession(ctx, session._id),
      getCurrentQuestionForSession(ctx, session),
    ]);
    const selectedQuestion =
      args.questionId && questions.some((question) => question._id === args.questionId)
        ? (questions.find((question) => question._id === args.questionId) ?? null)
        : currentQuestion;
    const selectedQuestionId = selectedQuestion?._id;

    const [
      participants,
      submissions,
      categories,
      assignments,
      reactions,
      pendingRequests,
    ] = await Promise.all([
      ctx.db
        .query("participants")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(PARTICIPANT_LIMIT),
      selectedQuestionId
        ? ctx.db
            .query("submissions")
            .withIndex("by_questionId_and_createdAt", (q) =>
              q.eq("questionId", selectedQuestionId),
            )
            .order("desc")
            .take(ROOM_SUBMISSION_LIMIT)
        : ctx.db
            .query("submissions")
            .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
            .order("desc")
            .take(ROOM_SUBMISSION_LIMIT),
      ctx.db
        .query("categories")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(CATEGORY_LIMIT),
      selectedQuestionId
        ? ctx.db
            .query("submissionCategories")
            .withIndex("by_questionId", (q) => q.eq("questionId", selectedQuestionId))
            .take(ROOM_SUBMISSION_LIMIT)
        : ctx.db
            .query("submissionCategories")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .take(ROOM_SUBMISSION_LIMIT),
      ctx.db
        .query("reactions")
        .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(ROOM_REACTION_LIMIT),
      selectedQuestionId
        ? ctx.db
            .query("recategorizationRequests")
            .withIndex("by_questionId_and_status", (q) =>
              q.eq("questionId", selectedQuestionId).eq("status", "pending"),
            )
            .take(50)
        : ctx.db
            .query("recategorizationRequests")
            .withIndex("by_session_and_status", (q) =>
              q.eq("sessionId", session._id).eq("status", "pending"),
            )
            .take(50),
    ]);

    const activeCategories = categories.filter(
      (category) =>
        category.status === "active" &&
        (!selectedQuestionId ||
          !category.questionId ||
          category.questionId === selectedQuestionId),
    );
    const categoriesById = new Map(categories.map((category) => [category._id, category]));
    const participantsById = new Map(
      participants.map((participant) => [participant._id, participant]),
    );
    const selectedSubmissionIds = new Set(submissions.map((submission) => submission._id));
    const assignmentBySubmission = new Map<
      Id<"submissions">,
      {
        questionId?: Id<"sessionQuestions">;
        categoryId: Id<"categories">;
        categoryName?: string;
        categorySlug?: string;
        categoryStatus?: "active" | "archived";
      }
    >();

    for (const assignment of assignments) {
      if (!selectedSubmissionIds.has(assignment.submissionId)) {
        continue;
      }

      const category = categoriesById.get(assignment.categoryId);
      assignmentBySubmission.set(assignment.submissionId, {
        questionId: assignment.questionId,
        categoryId: assignment.categoryId,
        categoryName: category?.name,
        categorySlug: category?.slug,
        categoryStatus: category?.status,
      });
    }

    const reactionsBySubmission = new Map<
      Id<"submissions">,
      { counts: ReturnType<typeof emptyReactionCounts> }
    >();

    for (const reaction of reactions) {
      if (!selectedSubmissionIds.has(reaction.submissionId)) {
        continue;
      }

      const state = reactionsBySubmission.get(reaction.submissionId) ?? {
        counts: emptyReactionCounts(),
      };
      state.counts[reaction.kind] += 1;
      reactionsBySubmission.set(reaction.submissionId, state);
    }

    const repliesByParentId = new Map<Id<"submissions">, Doc<"submissions">[]>();

    for (const submission of submissions) {
      if (!submission.parentSubmissionId) {
        continue;
      }

      const existing = repliesByParentId.get(submission.parentSubmissionId) ?? [];
      existing.push(submission);
      repliesByParentId.set(submission.parentSubmissionId, existing);
    }

    const toThreadMessage = (submission: Doc<"submissions">) => {
      const reactionState = reactionsBySubmission.get(submission._id);

      return {
        submission: toSubmission(
          submission,
          participantsById.get(submission.participantId) ?? null,
          assignmentBySubmission.get(submission._id) ?? null,
        ),
        stats: {
          replyCount: repliesByParentId.get(submission._id)?.length ?? 0,
          upvoteCount: reactionState?.counts.agree ?? 0,
          reactionCounts: reactionState?.counts ?? emptyReactionCounts(),
        },
      };
    };

    const toThread = (root: Doc<"submissions">) => {
      const assignment = assignmentBySubmission.get(root._id);

      return {
        root: toThreadMessage(root),
        replies: (repliesByParentId.get(root._id) ?? [])
          .sort((left, right) => left.createdAt - right.createdAt)
          .map(toThreadMessage),
        assignment: assignment
          ? {
              categoryId: assignment.categoryId,
              categorySlug: assignment.categorySlug,
              categoryName: assignment.categoryName,
              status: assignment.categoryStatus,
            }
          : null,
      };
    };

    const latestThreads = submissions
      .filter(isTopLevelMessage)
      .sort((left, right) => right.createdAt - left.createdAt)
      .map(toThread);
    const threadsByCategory = activeCategories.map((category) => ({
      category: {
        id: category._id,
        questionId: category.questionId,
        slug: category.slug,
        name: category.name,
        description: category.description,
        color: category.color,
        source: category.source,
        status: category.status,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
      threads: latestThreads.filter((thread) => thread.assignment?.categoryId === category._id),
    }));
    const uncategorizedThreads = latestThreads.filter((thread) => !thread.assignment);

    return {
      session: toSessionSnapshot(session, participants.length),
      selectedQuestion: selectedQuestion ? toPublicQuestion(selectedQuestion) : null,
      latestThreads,
      threadsByCategory,
      uncategorizedThreads,
      needsAttention: {
        uncategorizedCount: uncategorizedThreads.length,
        pendingRecategorisationCount: pendingRequests.length,
        failedLiveJobCount: 0,
      },
      caps: {
        submissions: submissions.length === ROOM_SUBMISSION_LIMIT,
        reactions: reactions.length === ROOM_REACTION_LIMIT,
      },
    };
  },
});

/**
 * Shell query — data shared by every tab and the persistent right rail.
 *
 * Smaller than `overview` on purpose. Returns only what the shell, top bar,
 * left rail navigation, and right rail components need to render. Workspace
 * tabs use their own focused queries (`setup`, `reports`) and `room`.
 */
export const shell = query({
  args: {
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const now = Date.now();
    const [
      questions,
      currentQuestion,
      participants,
      submissions,
      assignments,
      pendingRequests,
      auditEvents,
    ] = await Promise.all([
      listQuestionsForSession(ctx, session._id),
      getCurrentQuestionForSession(ctx, session),
      ctx.db
        .query("participants")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(PARTICIPANT_LIMIT),
      ctx.db
        .query("submissions")
        .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(SUBMISSION_LIMIT),
      ctx.db
        .query("submissionCategories")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(SUBMISSION_LIMIT),
      ctx.db
        .query("recategorizationRequests")
        .withIndex("by_session_and_status", (q) =>
          q.eq("sessionId", session._id).eq("status", "pending"),
        )
        .take(50),
      ctx.db
        .query("auditEvents")
        .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(AUDIT_LIMIT),
    ]);

    const selectedQuestion =
      args.questionId && questions.some((question) => question._id === args.questionId)
        ? (questions.find((question) => question._id === args.questionId) ?? null)
        : currentQuestion;

    const presenceAggregate: Record<PresenceState, number> = {
      typing: 0,
      submitted: 0,
      idle: 0,
      offline: 0,
    };

    const presenceSamples: Array<{
      participantId: Id<"participants">;
      participantSlug: string;
      nickname: string;
      state: PresenceState;
    }> = [];

    for (const participant of participants) {
      const derivedState =
        now - participant.lastSeenAt > OFFLINE_AFTER_MS ? "offline" : participant.presenceState;
      presenceAggregate[derivedState] += 1;

      if (derivedState !== "offline" && presenceSamples.length < 24) {
        presenceSamples.push({
          participantId: participant._id,
          participantSlug: participant.participantSlug,
          nickname: participant.nickname,
          state: derivedState,
        });
      }
    }

    const selectedQuestionId = selectedQuestion?._id;
    const scopedSubmissions = selectedQuestionId
      ? submissions.filter((submission) => submission.questionId === selectedQuestionId)
      : submissions;
    const scopedAssignments = selectedQuestionId
      ? assignments.filter((assignment) => assignment.questionId === selectedQuestionId)
      : assignments;
    const assignedSubmissionIds = new Set(
      scopedAssignments.map((assignment) => assignment.submissionId),
    );
    const uncategorizedCount = scopedSubmissions.filter(
      (submission) => !assignedSubmissionIds.has(submission._id),
    ).length;
    const scopedPendingRecat = selectedQuestionId
      ? pendingRequests.filter((request) => request.questionId === selectedQuestionId)
      : pendingRequests;

    const inputPatternAggregate: Record<InputPattern, number> = {
      composed_gradually: 0,
      likely_pasted: 0,
      mixed: 0,
      unknown: 0,
    };
    for (const submission of scopedSubmissions) {
      inputPatternAggregate[submission.inputPattern] += 1;
    }

    const activeCategories = await ctx.db
      .query("categories")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .take(CATEGORY_LIMIT);
    const scopedActiveCategories = selectedQuestionId
      ? activeCategories.filter(
          (category) => !category.questionId || category.questionId === selectedQuestionId,
        )
      : activeCategories;

    return {
      session: toSessionSnapshot(session, participants.length),
      questions: questions.map(toPublicQuestion),
      currentQuestion: currentQuestion ? toPublicQuestion(currentQuestion) : null,
      selectedQuestion: selectedQuestion ? toPublicQuestion(selectedQuestion) : null,
      visibility: {
        visibilityMode: session.visibilityMode,
        anonymityMode: session.anonymityMode,
        fightMeEnabled: session.fightMeEnabled,
        summaryGateEnabled: session.summaryGateEnabled,
        telemetryEnabled: session.telemetryEnabled,
      },
      counters: {
        typing: presenceAggregate.typing,
        submitted: scopedSubmissions.length,
        idle: presenceAggregate.idle,
        offline: presenceAggregate.offline,
        uncategorized: uncategorizedCount,
        pendingRecategorisation: scopedPendingRecat.length,
        connected: presenceAggregate.typing + presenceAggregate.submitted + presenceAggregate.idle,
        total: participants.length,
      },
      presence: {
        aggregate: presenceAggregate,
        samples: presenceSamples,
      },
      inputPatterns: inputPatternAggregate,
      categories: scopedActiveCategories
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((category) => ({ id: category._id, name: category.name })),
      activity: auditEvents.map(toAuditEvent),
    };
  },
});

/**
 * Setup query — preparation and configuration data.
 *
 * Returns the data needed by the Setup workspace: question list, selected
 * question full config, categories, follow-up drafts, baseline status, and
 * AI readiness summary. The live thread stream is not included here — that
 * belongs to `room`.
 */
export const setup = query({
  args: {
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const [questions, currentQuestion, categories, followUpPrompts, jobs] = await Promise.all([
      listQuestionsForSession(ctx, session._id),
      getCurrentQuestionForSession(ctx, session),
      ctx.db
        .query("categories")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(CATEGORY_LIMIT),
      ctx.db
        .query("followUpPrompts")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(FOLLOW_UP_LIMIT),
      ctx.db
        .query("aiJobs")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(JOB_LIMIT),
    ]);

    const selectedQuestion =
      args.questionId && questions.some((question) => question._id === args.questionId)
        ? (questions.find((question) => question._id === args.questionId) ?? null)
        : currentQuestion;
    const selectedQuestionId = selectedQuestion?._id;

    const baselineJobs = jobs.filter((job) => job.type === "question_baseline");
    const scopedBaselineJobs = selectedQuestionId
      ? baselineJobs.filter((job) => job.questionId === selectedQuestionId)
      : baselineJobs;

    return {
      session: toSessionSnapshot(session, 0),
      questions: questions.map(toPublicQuestion),
      currentQuestion: currentQuestion ? toPublicQuestion(currentQuestion) : null,
      selectedQuestion: selectedQuestion ? toPublicQuestion(selectedQuestion) : null,
      categories: categories
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((category) => ({
          id: category._id,
          questionId: category.questionId,
          slug: category.slug,
          name: category.name,
          description: category.description,
          color: category.color,
          parentCategoryId: category.parentCategoryId,
          smartTagId: category.smartTagId,
          source: category.source,
          status: category.status,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        })),
      followUpPrompts: followUpPrompts.map((prompt) => ({
        id: prompt._id,
        questionId: prompt.questionId,
        slug: prompt.slug,
        title: prompt.title,
        prompt: prompt.prompt,
        targetMode: prompt.targetMode,
        status: prompt.status,
        roundNumber: prompt.roundNumber,
        activatedAt: prompt.activatedAt,
        closedAt: prompt.closedAt,
        createdAt: prompt.createdAt,
        updatedAt: prompt.updatedAt,
      })),
      baseline: {
        latestJob: scopedBaselineJobs[0] ? toJob(scopedBaselineJobs[0]) : null,
        successCount: scopedBaselineJobs.filter((job) => job.status === "success").length,
        errorCount: scopedBaselineJobs.filter((job) => job.status === "error").length,
      },
      jobsRecent: jobs.slice(0, 12).map(toJob),
    };
  },
});

/**
 * Reports query — review and generated artifact data.
 *
 * Returns synthesis artifacts, personal reports, semantic counts, and AI job
 * history. Argument map graph data, novelty radar, and category drift remain
 * served by their dedicated query modules (`api.argumentMap.*`, `api.semantic.*`).
 */
export const reports = query({
  args: {
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const [
      questions,
      currentQuestion,
      participants,
      submissions,
      synthesisArtifacts,
      personalReports,
      semanticEmbeddings,
      semanticSignals,
      argumentLinks,
      jobs,
      fightThreads,
    ] = await Promise.all([
      listQuestionsForSession(ctx, session._id),
      getCurrentQuestionForSession(ctx, session),
      ctx.db
        .query("participants")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(PARTICIPANT_LIMIT),
      ctx.db
        .query("submissions")
        .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(SUBMISSION_LIMIT),
      ctx.db
        .query("synthesisArtifacts")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(SYNTHESIS_ARTIFACT_LIMIT),
      ctx.db
        .query("personalReports")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(PERSONAL_REPORT_LIMIT),
      ctx.db
        .query("semanticEmbeddings")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(SEMANTIC_ROW_LIMIT),
      ctx.db
        .query("semanticSignals")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(SEMANTIC_ROW_LIMIT),
      ctx.db
        .query("argumentLinks")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(SEMANTIC_ROW_LIMIT),
      ctx.db
        .query("aiJobs")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(JOB_LIMIT),
      ctx.db
        .query("fightThreads")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(FIGHT_THREAD_LIMIT),
    ]);

    const selectedQuestion =
      args.questionId && questions.some((question) => question._id === args.questionId)
        ? (questions.find((question) => question._id === args.questionId) ?? null)
        : currentQuestion;
    const selectedQuestionId = selectedQuestion?._id;

    const participantsById = new Map(
      participants.map((participant) => [participant._id, participant]),
    );

    const scopedSynthesisArtifacts = selectedQuestionId
      ? synthesisArtifacts.filter((artifact) => artifact.questionId === selectedQuestionId)
      : synthesisArtifacts;
    const synthesisCounts = emptyArtifactStatusCounts();
    for (const artifact of scopedSynthesisArtifacts) {
      synthesisCounts[artifact.status] += 1;
    }

    const reportCounts: Record<JobStatus, number> = emptyStatusCounts();
    for (const report of personalReports) {
      reportCounts[report.status] += 1;
    }

    const submissionCountsByParticipant = new Map<Id<"participants">, number>();
    const followUpCountsByParticipant = new Map<Id<"participants">, number>();

    for (const submission of submissions) {
      submissionCountsByParticipant.set(
        submission.participantId,
        (submissionCountsByParticipant.get(submission.participantId) ?? 0) + 1,
      );

      if (submission.kind !== "initial") {
        followUpCountsByParticipant.set(
          submission.participantId,
          (followUpCountsByParticipant.get(submission.participantId) ?? 0) + 1,
        );
      }
    }

    const fightCountsByParticipant = new Map<Id<"participants">, number>();
    for (const thread of fightThreads) {
      fightCountsByParticipant.set(
        thread.attackerParticipantId,
        (fightCountsByParticipant.get(thread.attackerParticipantId) ?? 0) + 1,
      );

      if (thread.defenderParticipantId) {
        fightCountsByParticipant.set(
          thread.defenderParticipantId,
          (fightCountsByParticipant.get(thread.defenderParticipantId) ?? 0) + 1,
        );
      }
    }

    return {
      session: toSessionSnapshot(session, participants.length),
      selectedQuestion: selectedQuestion ? toPublicQuestion(selectedQuestion) : null,
      synthesis: {
        counts: synthesisCounts,
        artifacts: scopedSynthesisArtifacts.map((artifact) => ({
          id: artifact._id,
          questionId: artifact.questionId,
          categoryId: artifact.categoryId,
          kind: artifact.kind,
          status: artifact.status,
          title: artifact.title,
          summary: artifact.summary,
          keyPoints: artifact.keyPoints,
          uniqueInsights: artifact.uniqueInsights,
          opposingViews: artifact.opposingViews,
          sourceCounts: artifact.sourceCounts,
          error: artifact.error,
          generatedAt: artifact.generatedAt,
          publishedAt: artifact.publishedAt,
          finalizedAt: artifact.finalizedAt,
          createdAt: artifact.createdAt,
          updatedAt: artifact.updatedAt,
        })),
      },
      personalReports: {
        counts: {
          ...reportCounts,
          total: personalReports.length,
          capped: personalReports.length === PERSONAL_REPORT_LIMIT,
        },
        items: personalReports.map((report) => ({
          id: report._id,
          participantId: report.participantId,
          nickname: participantsById.get(report.participantId)?.nickname ?? "Unknown",
          participantSlug:
            participantsById.get(report.participantId)?.participantSlug ?? "unknown",
          status: report.status,
          participationBand: report.participationBand,
          reasoningBand: report.reasoningBand,
          originalityBand: report.originalityBand,
          responsivenessBand: report.responsivenessBand,
          summary: report.summary,
          contributionTrace: report.contributionTrace,
          argumentEvolution: report.argumentEvolution,
          growthOpportunity: report.growthOpportunity,
          submissionCount: submissionCountsByParticipant.get(report.participantId) ?? 0,
          followUpCount: followUpCountsByParticipant.get(report.participantId) ?? 0,
          fightCount: fightCountsByParticipant.get(report.participantId) ?? 0,
          hasReportableActivity:
            (submissionCountsByParticipant.get(report.participantId) ?? 0) > 0 ||
            (fightCountsByParticipant.get(report.participantId) ?? 0) > 0,
          error: report.error,
          generatedAt: report.generatedAt,
          updatedAt: report.updatedAt,
        })),
      },
      semantic: {
        embeddingsCount: semanticEmbeddings.length,
        signalsCount: semanticSignals.length,
        argumentLinkCount: argumentLinks.length,
        embeddingsCapped: semanticEmbeddings.length === SEMANTIC_ROW_LIMIT,
        signalsCapped: semanticSignals.length === SEMANTIC_ROW_LIMIT,
        argumentLinksCapped: argumentLinks.length === SEMANTIC_ROW_LIMIT,
      },
      jobs: {
        recent: jobs.slice(0, 12).map(toJob),
        all: jobs.map(toJob),
      },
    };
  },
});
