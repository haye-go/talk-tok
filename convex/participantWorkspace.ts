import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  getCurrentQuestionForSession,
  listQuestionsForSession,
  toPublicQuestion,
} from "./sessionQuestions";

const MY_SUBMISSION_LIMIT = 60;
const SESSION_SUBMISSION_LIMIT = 180;
const CATEGORY_LIMIT = 100;
const PEER_RESPONSE_LIMIT = 30;
const JOB_LIMIT = 40;
const FIGHT_THREAD_LIMIT = 40;
const SYNTHESIS_ARTIFACT_LIMIT = 40;
const PARTICIPANT_PRESENCE_LIMIT = 500;
const THREAD_REACTION_LIMIT = 1_000;
const OFFLINE_AFTER_MS = 45_000;

const toneValidator = v.union(
  v.literal("gentle"),
  v.literal("direct"),
  v.literal("spicy"),
  v.literal("roast"),
);

type PublicSubmissionResult = {
  id: Id<"submissions">;
  sessionId: Id<"sessions">;
  questionId?: Id<"sessionQuestions">;
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

type SubmitAndQueueFeedbackResult = {
  submission: PublicSubmissionResult;
  feedback: PublicFeedbackResult;
  feedbackQueued: boolean;
  feedbackQueueError?: string;
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

function toSessionSnapshot(session: Doc<"sessions">) {
  return {
    slug: session.slug,
    joinCode: session.joinCode,
    title: session.title,
    openingPrompt: session.openingPrompt,
    currentQuestionId: session.currentQuestionId,
    phase: session.phase,
    currentAct: session.currentAct,
    visibilityMode: session.visibilityMode,
    anonymityMode: session.anonymityMode,
    responseSoftLimitWords: session.responseSoftLimitWords,
    critiqueToneDefault: session.critiqueToneDefault,
    fightMeEnabled: session.fightMeEnabled,
    summaryGateEnabled: session.summaryGateEnabled,
  };
}

function toParticipant(participant: Doc<"participants">) {
  return {
    id: participant._id,
    participantSlug: participant.participantSlug,
    nickname: participant.nickname,
    role: participant.role,
    joinedAt: participant.joinedAt,
    lastSeenAt: participant.lastSeenAt,
    presenceState: participant.presenceState,
  };
}

function orderReleasedQuestions(
  questions: Doc<"sessionQuestions">[],
  currentQuestionId?: Id<"sessionQuestions">,
) {
  return questions
    .filter((question) => question.status === "released")
    .sort((left, right) => {
      if (left._id === currentQuestionId) return -1;
      if (right._id === currentQuestionId) return 1;

      const leftReleasedAt = left.releasedAt ?? left.createdAt;
      const rightReleasedAt = right.releasedAt ?? right.createdAt;

      return rightReleasedAt - leftReleasedAt;
    });
}

function presenceAggregateFor(participants: Doc<"participants">[], now: number) {
  const aggregate = {
    total: participants.length,
    typing: 0,
    submitted: 0,
    idle: 0,
    offline: 0,
  };

  for (const row of participants) {
    const derivedState = now - row.lastSeenAt > OFFLINE_AFTER_MS ? "offline" : row.presenceState;
    aggregate[derivedState] += 1;
  }

  return aggregate;
}

function nicknameForPeer(session: Doc<"sessions">, participant: Doc<"participants"> | null) {
  if (session.anonymityMode === "anonymous_to_peers") {
    return "Anonymous";
  }

  return participant?.nickname ?? "Unknown";
}

function toSubmission(
  submission: Doc<"submissions">,
  participant: Doc<"participants"> | null,
  session: Doc<"sessions">,
) {
  return {
    id: submission._id,
    questionId: submission.questionId,
    participantId: submission.participantId,
    participantSlug: participant?.participantSlug ?? "unknown",
    nickname: nicknameForPeer(session, participant),
    body: submission.body,
    parentSubmissionId: submission.parentSubmissionId,
    followUpPromptId: submission.followUpPromptId,
    kind: submission.kind,
    wordCount: submission.wordCount,
    compositionMs: submission.compositionMs,
    pasteEventCount: submission.pasteEventCount,
    inputPattern: submission.inputPattern,
    createdAt: submission.createdAt,
  };
}

function toFeedback(feedback: Doc<"submissionFeedback">) {
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

function toRecategorisationRequest(request: Doc<"recategorizationRequests">) {
  return {
    id: request._id,
    questionId: request.questionId,
    submissionId: request.submissionId,
    currentCategoryId: request.currentCategoryId,
    requestedCategoryId: request.requestedCategoryId,
    suggestedCategoryName: request.suggestedCategoryName,
    reason: request.reason,
    status: request.status,
    instructorNote: request.instructorNote,
    llmRecommendation: request.llmRecommendation,
    decidedAt: request.decidedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
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

function toFightThread(thread: Doc<"fightThreads">) {
  return {
    id: thread._id,
    slug: thread.slug,
    mode: thread.mode,
    status: thread.status,
    attackerParticipantId: thread.attackerParticipantId,
    defenderParticipantId: thread.defenderParticipantId,
    attackerSubmissionId: thread.attackerSubmissionId,
    defenderSubmissionId: thread.defenderSubmissionId,
    currentTurnParticipantId: thread.currentTurnParticipantId,
    currentTurnRole: thread.currentTurnRole,
    nextTurnNumber: thread.nextTurnNumber,
    maxTurns: thread.maxTurns,
    acceptanceDeadlineAt: thread.acceptanceDeadlineAt,
    turnDeadlineAt: thread.turnDeadlineAt,
    acceptedAt: thread.acceptedAt,
    completedAt: thread.completedAt,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
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

function matchesSelectedQuestion(
  submission: Doc<"submissions">,
  selectedQuestionId?: Id<"sessionQuestions">,
) {
  return !selectedQuestionId || !submission.questionId || submission.questionId === selectedQuestionId;
}

function isTopLevelMessage(submission: Doc<"submissions">) {
  return (
    !submission.parentSubmissionId &&
    !submission.followUpPromptId &&
    (submission.kind === "initial" || submission.kind === "additional_point")
  );
}

export const overview = query({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
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

    const [
      questions,
      currentQuestion,
      mySubmissions,
      sessionSubmissions,
      categories,
      feedback,
      requests,
      jobs,
      followUpPrompts,
      attackingFightThreads,
      defendingFightThreads,
      publishedArtifacts,
      finalArtifacts,
      personalReports,
      presenceParticipants,
    ] = await Promise.all([
      listQuestionsForSession(ctx, session._id),
      getCurrentQuestionForSession(ctx, session),
      ctx.db
        .query("submissions")
        .withIndex("by_participant_and_created_at", (q) => q.eq("participantId", participant._id))
        .order("desc")
        .take(MY_SUBMISSION_LIMIT),
      ctx.db
        .query("submissions")
        .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(SESSION_SUBMISSION_LIMIT),
      ctx.db
        .query("categories")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(CATEGORY_LIMIT),
      ctx.db
        .query("submissionFeedback")
        .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
        .order("desc")
        .take(MY_SUBMISSION_LIMIT),
      ctx.db
        .query("recategorizationRequests")
        .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
        .order("desc")
        .take(MY_SUBMISSION_LIMIT),
      ctx.db
        .query("aiJobs")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(JOB_LIMIT),
      ctx.db
        .query("followUpPrompts")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .take(80),
      ctx.db
        .query("fightThreads")
        .withIndex("by_attacker", (q) => q.eq("attackerParticipantId", participant._id))
        .order("desc")
        .take(FIGHT_THREAD_LIMIT),
      ctx.db
        .query("fightThreads")
        .withIndex("by_defender", (q) => q.eq("defenderParticipantId", participant._id))
        .order("desc")
        .take(FIGHT_THREAD_LIMIT),
      ctx.db
        .query("synthesisArtifacts")
        .withIndex("by_session_and_status", (q) =>
          q.eq("sessionId", session._id).eq("status", "published"),
        )
        .order("desc")
        .take(SYNTHESIS_ARTIFACT_LIMIT),
      ctx.db
        .query("synthesisArtifacts")
        .withIndex("by_session_and_status", (q) =>
          q.eq("sessionId", session._id).eq("status", "final"),
        )
        .order("desc")
        .take(SYNTHESIS_ARTIFACT_LIMIT),
      ctx.db
        .query("personalReports")
        .withIndex("by_session_and_participant", (q) =>
          q.eq("sessionId", session._id).eq("participantId", participant._id),
        )
        .order("desc")
        .take(1),
      ctx.db
        .query("participants")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(PARTICIPANT_PRESENCE_LIMIT),
    ]);
    const requestedQuestion = args.questionId ? await ctx.db.get(args.questionId) : null;
    const releasedQuestionsOrdered = orderReleasedQuestions(questions, currentQuestion?._id);
    const selectedQuestion =
      requestedQuestion &&
      requestedQuestion.sessionId === session._id &&
      requestedQuestion.status === "released"
        ? requestedQuestion
        : currentQuestion?.status === "released"
          ? currentQuestion
          : (releasedQuestionsOrdered[0] ?? null);

    const selectedQuestionId = selectedQuestion?._id;
    const presenceAggregate = presenceAggregateFor(presenceParticipants, Date.now());
    const synthesisVisible =
      Boolean(selectedQuestion?.synthesisVisible) &&
      session.visibilityMode !== "private_until_released";
    const synthesisPublishedArtifacts = synthesisVisible
      ? selectedQuestionId
        ? await ctx.db
            .query("synthesisArtifacts")
            .withIndex("by_questionId_and_status", (q) =>
              q.eq("questionId", selectedQuestionId).eq("status", "published"),
            )
            .order("desc")
            .take(SYNTHESIS_ARTIFACT_LIMIT)
        : publishedArtifacts
      : [];
    const synthesisFinalArtifacts = synthesisVisible
      ? selectedQuestionId
        ? await ctx.db
            .query("synthesisArtifacts")
            .withIndex("by_questionId_and_status", (q) =>
              q.eq("questionId", selectedQuestionId).eq("status", "final"),
            )
            .order("desc")
            .take(SYNTHESIS_ARTIFACT_LIMIT)
        : finalArtifacts
      : [];
    const activeCategories = categories.filter(
      (category) =>
        category.status === "active" &&
        (!selectedQuestionId || !category.questionId || category.questionId === selectedQuestionId),
    );
    const categoriesById = new Map(categories.map((category) => [category._id, category]));
    const participantIds = new Set(
      sessionSubmissions.map((submission) => submission.participantId),
    );
    const participantsById = new Map<Id<"participants">, Doc<"participants">>();
    const categoryCounts = new Map<Id<"categories">, number>();
    const assignmentBySubmission = new Map<
      Id<"submissions">,
      {
        id: Id<"submissionCategories">;
        questionId?: Id<"sessionQuestions">;
        categoryId: Id<"categories">;
        categorySlug?: string;
        categoryName?: string;
        categoryColor?: string;
        categoryStatus?: "active" | "archived";
        confidence: number;
        rationale?: string;
        status: "suggested" | "confirmed" | "recategorization_requested";
        createdAt: number;
      }
    >();

    for (const participantId of participantIds) {
      const row = await ctx.db.get(participantId);

      if (row) {
        participantsById.set(row._id, row);
      }
    }

    for (const submission of sessionSubmissions) {
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
      categoryCounts.set(
        assignment.categoryId,
        (categoryCounts.get(assignment.categoryId) ?? 0) + 1,
      );
      assignmentBySubmission.set(submission._id, {
        id: assignment._id,
        questionId: assignment.questionId,
        categoryId: assignment.categoryId,
        categorySlug: category?.slug,
        categoryName: category?.name,
        categoryColor: category?.color,
        categoryStatus: category?.status,
        confidence: assignment.confidence,
        rationale: assignment.rationale,
        status: assignment.status,
        createdAt: assignment.createdAt,
      });
    }

    const mySubmissionIds = new Set(mySubmissions.map((submission) => submission._id));
    const myCategoryIds = new Set<Id<"categories">>();

    for (const submission of mySubmissions) {
      const assignment = assignmentBySubmission.get(submission._id);

      if (assignment) {
        myCategoryIds.add(assignment.categoryId);
      }
    }

    const activeFollowUps = [];
    const activeFollowUpPrompts = followUpPrompts.filter(
      (followUpPrompt) => followUpPrompt.status === "active",
    );

    for (const followUpPrompt of activeFollowUpPrompts) {
      const targets = await ctx.db
        .query("followUpTargets")
        .withIndex("by_prompt", (q) => q.eq("followUpPromptId", followUpPrompt._id))
        .take(20);
      const isRelevant =
        followUpPrompt.targetMode === "all" ||
        targets.some((target) => target.categoryId && myCategoryIds.has(target.categoryId));

      if (!isRelevant) {
        continue;
      }

      activeFollowUps.push({
        id: followUpPrompt._id,
        questionId: followUpPrompt.questionId,
        slug: followUpPrompt.slug,
        title: followUpPrompt.title,
        prompt: followUpPrompt.prompt,
        instructions: followUpPrompt.instructions,
        targetMode: followUpPrompt.targetMode,
        roundNumber: followUpPrompt.roundNumber,
        activatedAt: followUpPrompt.activatedAt,
        targets: await Promise.all(
          targets.map(async (target) => {
            const category = target.categoryId ? await ctx.db.get(target.categoryId) : null;

            return {
              id: target._id,
              questionId: target.questionId,
              targetKind: target.targetKind,
              categoryId: target.categoryId,
              categorySlug: category?.slug,
              categoryName: category?.name,
              categoryColor: category?.color,
            };
          }),
        ),
        myResponseCount: mySubmissions.filter(
          (submission) => submission.followUpPromptId === followUpPrompt._id,
        ).length,
      });
    }

    const feedbackBySubmission = feedback
      .filter((row) => mySubmissionIds.has(row.submissionId))
      .map(toFeedback);
    const feedbackMap = new Map(feedbackBySubmission.map((row) => [row.submissionId, row]));
    const recategorisationRequests = requests
      .filter((row) => mySubmissionIds.has(row.submissionId))
      .map(toRecategorisationRequest);
    const recategorisationMap = new Map(
      recategorisationRequests.map((row) => [row.submissionId, row]),
    );
    const selectedQuestionSubmissions = sessionSubmissions.filter((submission) =>
      matchesSelectedQuestion(submission, selectedQuestionId),
    );
    const selectedQuestionSubmissionIds = new Set(
      selectedQuestionSubmissions.map((submission) => submission._id),
    );
    const reactions =
      selectedQuestionSubmissionIds.size > 0
        ? await ctx.db
            .query("reactions")
            .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
            .order("desc")
            .take(THREAD_REACTION_LIMIT)
        : [];
    const reactionsBySubmission = new Map<
      Id<"submissions">,
      {
        counts: ReturnType<typeof emptyReactionCounts>;
        myReactions: Doc<"reactions">["kind"][];
      }
    >();

    for (const reaction of reactions) {
      if (!selectedQuestionSubmissionIds.has(reaction.submissionId)) {
        continue;
      }

      const state = reactionsBySubmission.get(reaction.submissionId) ?? {
        counts: emptyReactionCounts(),
        myReactions: [],
      };
      state.counts[reaction.kind] += 1;

      if (reaction.participantId === participant._id) {
        state.myReactions.push(reaction.kind);
      }

      reactionsBySubmission.set(reaction.submissionId, state);
    }

    const repliesByParentId = new Map<Id<"submissions">, Doc<"submissions">[]>();

    for (const submission of selectedQuestionSubmissions) {
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
          session,
        ),
        stats: {
          replyCount: repliesByParentId.get(submission._id)?.length ?? 0,
          upvoteCount: reactionState?.counts.agree ?? 0,
          reactionCounts: reactionState?.counts ?? emptyReactionCounts(),
        },
        viewerState: {
          isOwn: submission.participantId === participant._id,
          hasUpvoted: reactionState?.myReactions.includes("agree") ?? false,
          myReactions: reactionState?.myReactions ?? [],
        },
      };
    };

    const toThread = (root: Doc<"submissions">) => {
      const assignment = assignmentBySubmission.get(root._id);
      const rootFeedback = feedbackMap.get(root._id);
      const recategorisationRequest = recategorisationMap.get(root._id);

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
              categoryColor: assignment.categoryColor,
              status: assignment.status,
            }
          : null,
        feedbackSummary: rootFeedback
          ? {
              status: rootFeedback.status,
              tone: rootFeedback.tone,
              reasoningBand: rootFeedback.reasoningBand,
              originalityBand: rootFeedback.originalityBand,
              specificityBand: rootFeedback.specificityBand,
              summary: rootFeedback.summary,
              error: rootFeedback.error,
            }
          : null,
        recategorisationRequest: recategorisationRequest
          ? {
              status: recategorisationRequest.status,
              requestedCategoryId: recategorisationRequest.requestedCategoryId,
              suggestedCategoryName: recategorisationRequest.suggestedCategoryName,
            }
          : null,
      };
    };

    const myThreads = selectedQuestionSubmissions
      .filter(
        (submission) => submission.participantId === participant._id && isTopLevelMessage(submission),
      )
      .sort((left, right) => right.createdAt - left.createdAt)
      .map(toThread);
    const canSeeSelectedPeerThreads =
      selectedQuestion?.peerResponsesVisible ?? session.visibilityMode === "raw_responses_visible";
    const peerThreads = canSeeSelectedPeerThreads
      ? selectedQuestionSubmissions
          .filter(
            (submission) =>
              submission.participantId !== participant._id && isTopLevelMessage(submission),
          )
          .sort((left, right) => right.createdAt - left.createdAt)
          .slice(0, PEER_RESPONSE_LIMIT)
          .map(toThread)
      : [];
    const peerResponses =
      session.visibilityMode === "raw_responses_visible"
        ? sessionSubmissions
            .filter((submission) => submission.participantId !== participant._id)
            .slice(0, PEER_RESPONSE_LIMIT)
            .map((submission) => {
              const assignment = assignmentBySubmission.get(submission._id);

              return {
                ...toSubmission(
                  submission,
                  participantsById.get(submission.participantId) ?? null,
                  session,
                ),
                categoryId: assignment?.categoryId,
                categorySlug: assignment?.categorySlug,
                categoryName: assignment?.categoryName,
                categoryColor: assignment?.categoryColor,
              };
            })
        : [];
    const fightThreadsById = new Map(
      [...attackingFightThreads, ...defendingFightThreads]
        .filter((thread) => thread.sessionId === session._id)
        .map((thread) => [thread._id, thread]),
    );
    const fightThreads = [...fightThreadsById.values()]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, FIGHT_THREAD_LIMIT);

    return {
      session: toSessionSnapshot(session),
      questions: releasedQuestionsOrdered.map(toPublicQuestion),
      releasedQuestionsOrdered: releasedQuestionsOrdered.map(toPublicQuestion),
      currentQuestion: currentQuestion ? toPublicQuestion(currentQuestion) : null,
      selectedQuestion: selectedQuestion ? toPublicQuestion(selectedQuestion) : null,
      participant: toParticipant(participant),
      presenceAggregate,
      visibility: {
        mode: session.visibilityMode,
        canSeeCategorySummary:
          session.visibilityMode === "category_summary_only" ||
          session.visibilityMode === "raw_responses_visible",
        canSeeRawPeerResponses: session.visibilityMode === "raw_responses_visible",
      },
      mySubmissions: mySubmissions.map((submission) =>
        toSubmission(submission, participant, session),
      ),
      myThreads,
      peerThreads,
      activeFollowUps,
      feedbackBySubmission,
      assignmentsBySubmission: mySubmissions
        .map((submission) => {
          const assignment = assignmentBySubmission.get(submission._id);

          if (!assignment) {
            return null;
          }

          return {
            submissionId: submission._id,
            ...assignment,
          };
        })
        .filter((assignment): assignment is NonNullable<typeof assignment> => Boolean(assignment)),
      recategorisationRequests,
      categorySummary:
        session.visibilityMode === "category_summary_only" ||
        session.visibilityMode === "raw_responses_visible"
          ? activeCategories
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((category) => ({
                id: category._id,
                questionId: category.questionId,
                slug: category.slug,
                name: category.name,
                description: category.description,
                color: category.color,
                parentCategoryId: category.parentCategoryId,
                assignmentCount: categoryCounts.get(category._id) ?? 0,
              }))
          : [],
      recentPeerResponses: peerResponses,
      recentJobs: jobs
        .filter((job) => !job.submissionId || mySubmissionIds.has(job.submissionId))
        .slice(0, 20)
        .map(toJob),
      fightMe: {
        mine: fightThreads.map(toFightThread),
        pendingIncoming: fightThreads
          .filter(
            (thread) =>
              thread.status === "pending_acceptance" &&
              thread.defenderParticipantId === participant._id,
          )
          .map(toFightThread),
        current: fightThreads.find(
          (thread) => thread.status === "active" || thread.status === "pending_acceptance",
        )
          ? toFightThread(
              fightThreads.find(
                (thread) => thread.status === "active" || thread.status === "pending_acceptance",
              )!,
            )
          : null,
      },
      synthesis: {
        visible: synthesisVisible,
        publishedArtifacts: synthesisPublishedArtifacts
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, SYNTHESIS_ARTIFACT_LIMIT)
          .map((artifact) => ({
            id: artifact._id,
            categoryId: artifact.categoryId,
            kind: artifact.kind,
            status: artifact.status,
            title: artifact.title,
            summary: artifact.summary,
            keyPoints: artifact.keyPoints,
            uniqueInsights: artifact.uniqueInsights,
            opposingViews: artifact.opposingViews,
            generatedAt: artifact.generatedAt,
            publishedAt: artifact.publishedAt,
            finalizedAt: artifact.finalizedAt,
            updatedAt: artifact.updatedAt,
          })),
        finalArtifacts: synthesisFinalArtifacts
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, SYNTHESIS_ARTIFACT_LIMIT)
          .map((artifact) => ({
            id: artifact._id,
            categoryId: artifact.categoryId,
            kind: artifact.kind,
            status: artifact.status,
            title: artifact.title,
            summary: artifact.summary,
            keyPoints: artifact.keyPoints,
            uniqueInsights: artifact.uniqueInsights,
            opposingViews: artifact.opposingViews,
            generatedAt: artifact.generatedAt,
            publishedAt: artifact.publishedAt,
            finalizedAt: artifact.finalizedAt,
            updatedAt: artifact.updatedAt,
          })),
      },
      personalReport: personalReports[0]
        ? {
            id: personalReports[0]._id,
            status: personalReports[0].status,
            participationBand: personalReports[0].participationBand,
            reasoningBand: personalReports[0].reasoningBand,
            originalityBand: personalReports[0].originalityBand,
            responsivenessBand: personalReports[0].responsivenessBand,
            summary: personalReports[0].summary,
            contributionTrace: personalReports[0].contributionTrace,
            argumentEvolution: personalReports[0].argumentEvolution,
            growthOpportunity: personalReports[0].growthOpportunity,
            error: personalReports[0].error,
            generatedAt: personalReports[0].generatedAt,
            updatedAt: personalReports[0].updatedAt,
          }
        : null,
      myZoneHistory: {
        initialResponses: mySubmissions
          .filter((submission) => submission.kind === "initial")
          .map((submission) => toSubmission(submission, participant, session)),
        followUpResponses: mySubmissions
          .filter((submission) => submission.kind !== "initial")
          .map((submission) => {
            const followUpPrompt = followUpPrompts.find(
              (prompt) => prompt._id === submission.followUpPromptId,
            );

            return {
              ...toSubmission(submission, participant, session),
              followUpTitle: followUpPrompt?.title ?? "Additional point",
              followUpSlug: followUpPrompt?.slug,
              followUpRoundNumber: followUpPrompt?.roundNumber,
            };
          }),
        timeline: mySubmissions.map((submission) => ({
          type: submission.kind !== "initial" ? "follow_up_response" : "response",
          submission: toSubmission(submission, participant, session),
        })),
      },
      caps: {
        mySubmissionsCapped: mySubmissions.length === MY_SUBMISSION_LIMIT,
        sessionSubmissionsCapped: sessionSubmissions.length === SESSION_SUBMISSION_LIMIT,
        categoriesCapped: categories.length === CATEGORY_LIMIT,
      },
    };
  },
});

export const submitAndQueueFeedback = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    body: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
    kind: v.union(v.literal("initial"), v.literal("additional_point"), v.literal("reply")),
    parentSubmissionId: v.optional(v.id("submissions")),
    followUpPromptId: v.optional(v.id("followUpPrompts")),
    tone: v.optional(toneValidator),
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
  handler: async (ctx, args): Promise<SubmitAndQueueFeedbackResult> => {
    const submission: PublicSubmissionResult = await ctx.runMutation(api.submissions.create, {
      sessionSlug: args.sessionSlug,
      clientKey: args.clientKey,
      body: args.body,
      questionId: args.questionId,
      kind: args.kind,
      parentSubmissionId: args.parentSubmissionId,
      followUpPromptId: args.followUpPromptId,
      telemetry: args.telemetry,
    });
    try {
      const feedback: PublicFeedbackResult = await ctx.runMutation(
        api.aiFeedback.enqueueForSubmission,
        {
          sessionSlug: args.sessionSlug,
          clientKey: args.clientKey,
          submissionId: submission.id,
          tone: args.tone,
        },
      );

      return { submission, feedback, feedbackQueued: true };
    } catch (cause) {
      const session = await ctx.db.get(submission.sessionId);
      const now = Date.now();
      const feedbackId = await ctx.db.insert("submissionFeedback", {
        sessionId: submission.sessionId,
        submissionId: submission.id,
        participantId: submission.participantId,
        status: "error",
        tone: args.tone ?? session?.critiqueToneDefault ?? "direct",
        error:
          cause instanceof Error
            ? cause.message
            : "The contribution was saved, but feedback could not be queued.",
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("aiJobs", {
        sessionId: submission.sessionId,
        questionId: submission.questionId,
        submissionId: submission.id,
        type: "feedback",
        status: "error",
        requestedBy: "participant",
        error:
          cause instanceof Error
            ? cause.message
            : "The contribution was saved, but feedback could not be queued.",
        createdAt: now,
        updatedAt: now,
      });

      const feedback = await ctx.db.get(feedbackId);

      if (!feedback) {
        throw cause;
      }

      await ctx.runMutation(internal.audit.record, {
        sessionId: submission.sessionId,
        questionId: submission.questionId,
        actorType: "participant",
        actorParticipantId: submission.participantId,
        action: "feedback.queue_failed",
        targetType: "submissionFeedback",
        targetId: feedbackId,
        metadataJson: { submissionId: submission.id },
      });

      return {
        submission,
        feedback: toFeedback(feedback),
        feedbackQueued: false,
        feedbackQueueError: feedback.error,
      };
    }
  },
});
