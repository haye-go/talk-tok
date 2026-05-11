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
const RECENT_SUBMISSION_LIMIT = 30;
const FOLLOW_UP_LIMIT = 30;
const FIGHT_THREAD_LIMIT = 60;
const SYNTHESIS_ARTIFACT_LIMIT = 80;
const PERSONAL_REPORT_LIMIT = 220;
const OFFLINE_AFTER_MS = 60_000;

type PresenceState = "typing" | "submitted" | "idle" | "offline";
type InputPattern = "composed_gradually" | "likely_pasted" | "mixed" | "unknown";
type JobStatus = "queued" | "processing" | "success" | "error";
type JobType =
  | "feedback"
  | "categorisation"
  | "moderation"
  | "synthesis"
  | "fight_challenge"
  | "fight_debrief"
  | "personal_report"
  | "argument_map";
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

function emptyJobSummary(): Record<JobType, Record<JobStatus, number>> {
  return {
    feedback: emptyStatusCounts(),
    categorisation: emptyStatusCounts(),
    moderation: emptyStatusCounts(),
    synthesis: emptyStatusCounts(),
    fight_challenge: emptyStatusCounts(),
    fight_debrief: emptyStatusCounts(),
    personal_report: emptyStatusCounts(),
    argument_map: emptyStatusCounts(),
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

function toSubmission(
  submission: Doc<"submissions">,
  participant: Doc<"participants"> | null,
  assignment: { categoryId: Id<"categories">; categoryName?: string; categorySlug?: string } | null,
) {
  return {
    id: submission._id,
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
    categoryName: assignment?.categoryName,
    categorySlug: assignment?.categorySlug,
    createdAt: submission.createdAt,
  };
}

export const overview = query({
  args: {
    sessionSlug: v.string(),
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
      categories,
      jobs,
      auditEvents,
      pendingRequests,
      followUpPrompts,
      fightThreads,
      synthesisArtifacts,
      personalReports,
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
        .query("categories")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(CATEGORY_LIMIT),
      ctx.db
        .query("aiJobs")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(JOB_LIMIT),
      ctx.db
        .query("auditEvents")
        .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(AUDIT_LIMIT),
      ctx.db
        .query("recategorizationRequests")
        .withIndex("by_session_and_status", (q) =>
          q.eq("sessionId", session._id).eq("status", "pending"),
        )
        .order("desc")
        .take(50),
      ctx.db
        .query("followUpPrompts")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(FOLLOW_UP_LIMIT),
      ctx.db
        .query("fightThreads")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(FIGHT_THREAD_LIMIT),
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
    ]);

    const participantsById = new Map(
      participants.map((participant) => [participant._id, participant]),
    );
    const activeCategories = categories.filter((category) => category.status === "active");
    const categoriesById = new Map(activeCategories.map((category) => [category._id, category]));
    const assignmentBySubmission = new Map<
      Id<"submissions">,
      { categoryId: Id<"categories">; categoryName?: string; categorySlug?: string }
    >();
    const categoryCounts = new Map<Id<"categories">, number>();
    const presenceAggregate: Record<PresenceState, number> = {
      typing: 0,
      submitted: 0,
      idle: 0,
      offline: 0,
    };
    const inputPatternAggregate: Record<InputPattern, number> = {
      composed_gradually: 0,
      likely_pasted: 0,
      mixed: 0,
      unknown: 0,
    };

    for (const participant of participants) {
      const derivedState =
        now - participant.lastSeenAt > OFFLINE_AFTER_MS ? "offline" : participant.presenceState;
      presenceAggregate[derivedState] += 1;
    }

    for (const submission of submissions) {
      inputPatternAggregate[submission.inputPattern] += 1;

      const assignment = await ctx.db
        .query("submissionCategories")
        .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
        .order("desc")
        .take(1)
        .then((rows) => rows[0]);

      if (!assignment) {
        continue;
      }

      const category = categoriesById.get(assignment.categoryId);
      assignmentBySubmission.set(submission._id, {
        categoryId: assignment.categoryId,
        categoryName: category?.name,
        categorySlug: category?.slug,
      });
      categoryCounts.set(
        assignment.categoryId,
        (categoryCounts.get(assignment.categoryId) ?? 0) + 1,
      );
    }

    const jobSummary = emptyJobSummary();

    for (const job of jobs) {
      jobSummary[job.type][job.status] += 1;
    }

    const synthesisCounts = emptyArtifactStatusCounts();
    for (const artifact of synthesisArtifacts) {
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
      questions: questions.map(toPublicQuestion),
      currentQuestion: currentQuestion ? toPublicQuestion(currentQuestion) : null,
      selectedQuestion: currentQuestion ? toPublicQuestion(currentQuestion) : null,
      caps: {
        participantsCapped: participants.length === PARTICIPANT_LIMIT,
        submissionsCapped: submissions.length === SUBMISSION_LIMIT,
        categoriesCapped: categories.length === CATEGORY_LIMIT,
      },
      presence: {
        ...presenceAggregate,
        total: participants.length,
      },
      responses: {
        total: submissions.length,
        initial: submissions.filter((submission) => submission.kind === "initial").length,
        followUps: submissions.filter((submission) => submission.kind !== "initial").length,
        uncategorized: submissions.length - assignmentBySubmission.size,
        inputPatterns: inputPatternAggregate,
      },
      categories: activeCategories
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((category) => ({
          id: category._id,
          slug: category.slug,
          name: category.name,
          description: category.description,
          color: category.color,
          parentCategoryId: category.parentCategoryId,
          smartTagId: category.smartTagId,
          source: category.source,
          status: category.status,
          assignmentCount: categoryCounts.get(category._id) ?? 0,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        })),
      presenceAggregate: {
        ...presenceAggregate,
        total: participants.length,
      },
      submissionAggregate: {
        total: submissions.length,
        initial: submissions.filter((submission) => submission.kind === "initial").length,
        followUps: submissions.filter((submission) => submission.kind !== "initial").length,
        inputPatterns: inputPatternAggregate,
      },
      uncategorizedCount: submissions.length - assignmentBySubmission.size,
      pendingRecategorisationCount: pendingRequests.length,
      recentAuditEvents: auditEvents.map(toAuditEvent),
      followUpSummary: {
        activeCount: followUpPrompts.filter((prompt) => prompt.status === "active").length,
        draftCount: followUpPrompts.filter((prompt) => prompt.status === "draft").length,
        closedCount: followUpPrompts.filter((prompt) => prompt.status === "closed").length,
      },
      recategorisation: {
        pendingCount: pendingRequests.length,
        pendingCapped: pendingRequests.length === 50,
      },
      followUps: {
        activeCount: followUpPrompts.filter((prompt) => prompt.status === "active").length,
        draftCount: followUpPrompts.filter((prompt) => prompt.status === "draft").length,
        closedCount: followUpPrompts.filter((prompt) => prompt.status === "closed").length,
        recent: await Promise.all(
          followUpPrompts.slice(0, 10).map(async (prompt) => {
            const targets = await ctx.db
              .query("followUpTargets")
              .withIndex("by_prompt", (q) => q.eq("followUpPromptId", prompt._id))
              .take(20);
            const responses = await ctx.db
              .query("submissions")
              .withIndex("by_follow_up_prompt", (q) => q.eq("followUpPromptId", prompt._id))
              .take(200);

            return {
              id: prompt._id,
              slug: prompt.slug,
              title: prompt.title,
              prompt: prompt.prompt,
              targetMode: prompt.targetMode,
              status: prompt.status,
              roundNumber: prompt.roundNumber,
              activatedAt: prompt.activatedAt,
              closedAt: prompt.closedAt,
              targetCount: targets.length,
              responseCount: responses.length,
              responseCountCapped: responses.length === 200,
              createdAt: prompt.createdAt,
              updatedAt: prompt.updatedAt,
            };
          }),
        ),
      },
      jobs: {
        latest: jobs.slice(0, 12).map(toJob),
        summary: jobSummary,
      },
      fightMe: {
        activeCount: fightThreads.filter((thread) => thread.status === "active").length,
        pendingCount: fightThreads.filter((thread) => thread.status === "pending_acceptance")
          .length,
        completedCount: fightThreads.filter((thread) => thread.status === "completed").length,
        timedOutCount: fightThreads.filter((thread) => thread.status === "timed_out").length,
        recent: fightThreads.slice(0, 12).map((thread) => ({
          id: thread._id,
          slug: thread.slug,
          mode: thread.mode,
          status: thread.status,
          attackerParticipantId: thread.attackerParticipantId,
          defenderParticipantId: thread.defenderParticipantId,
          nextTurnNumber: thread.nextTurnNumber,
          maxTurns: thread.maxTurns,
          acceptanceDeadlineAt: thread.acceptanceDeadlineAt,
          turnDeadlineAt: thread.turnDeadlineAt,
          completedAt: thread.completedAt,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
        })),
      },
      synthesis: {
        artifactCounts: synthesisCounts,
        recentArtifacts: synthesisArtifacts.slice(0, 8).map((artifact) => ({
          id: artifact._id,
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
        latestClassSynthesis: synthesisArtifacts.find(
          (artifact) =>
            artifact.kind === "class_synthesis" &&
            (artifact.status === "draft" ||
              artifact.status === "published" ||
              artifact.status === "final"),
        )
          ? (() => {
              const artifact = synthesisArtifacts.find(
                (row) =>
                  row.kind === "class_synthesis" &&
                  (row.status === "draft" || row.status === "published" || row.status === "final"),
              )!;

              return {
                id: artifact._id,
                status: artifact.status,
                title: artifact.title,
                summary: artifact.summary,
                keyPoints: artifact.keyPoints,
                updatedAt: artifact.updatedAt,
              };
            })()
          : null,
      },
      reports: {
        summary: {
          ...reportCounts,
          total: personalReports.length,
          capped: personalReports.length === PERSONAL_REPORT_LIMIT,
        },
        recent: personalReports.slice(0, 12).map((report) => ({
          id: report._id,
          participantId: report.participantId,
          nickname: participantsById.get(report.participantId)?.nickname ?? "Unknown",
          participantSlug: participantsById.get(report.participantId)?.participantSlug ?? "unknown",
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
      recentSubmissions: submissions
        .slice(0, RECENT_SUBMISSION_LIMIT)
        .map((submission) =>
          toSubmission(
            submission,
            participantsById.get(submission.participantId) ?? null,
            assignmentBySubmission.get(submission._id) ?? null,
          ),
        ),
      activity: auditEvents.map(toAuditEvent),
    };
  },
});
