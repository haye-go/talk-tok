import { v } from "convex/values";
import { api } from "./_generated/api";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const MY_SUBMISSION_LIMIT = 60;
const SESSION_SUBMISSION_LIMIT = 180;
const CATEGORY_LIMIT = 100;
const PEER_RESPONSE_LIMIT = 30;
const JOB_LIMIT = 40;
const FIGHT_THREAD_LIMIT = 40;
const SYNTHESIS_ARTIFACT_LIMIT = 40;

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

type SubmitAndQueueFeedbackResult = {
  submission: PublicSubmissionResult;
  feedback: PublicFeedbackResult;
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

export const overview = query({
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

    const [
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
    ] = await Promise.all([
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
    ]);

    const activeCategories = categories.filter((category) => category.status === "active");
    const categoriesById = new Map(activeCategories.map((category) => [category._id, category]));
    const participantIds = new Set(
      sessionSubmissions.map((submission) => submission.participantId),
    );
    const participantsById = new Map<Id<"participants">, Doc<"participants">>();
    const categoryCounts = new Map<Id<"categories">, number>();
    const assignmentBySubmission = new Map<
      Id<"submissions">,
      {
        id: Id<"submissionCategories">;
        categoryId: Id<"categories">;
        categorySlug?: string;
        categoryName?: string;
        categoryColor?: string;
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
        categoryId: assignment.categoryId,
        categorySlug: category?.slug,
        categoryName: category?.name,
        categoryColor: category?.color,
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
    const recategorisationRequests = requests
      .filter((row) => mySubmissionIds.has(row.submissionId))
      .map(toRecategorisationRequest);
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
      participant: toParticipant(participant),
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
        publishedArtifacts:
          session.visibilityMode === "private_until_released"
            ? []
            : publishedArtifacts
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
        finalArtifacts:
          session.visibilityMode === "private_until_released"
            ? []
            : finalArtifacts
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
      kind: args.kind,
      parentSubmissionId: args.parentSubmissionId,
      followUpPromptId: args.followUpPromptId,
      telemetry: args.telemetry,
    });
    const feedback: PublicFeedbackResult = await ctx.runMutation(
      api.aiFeedback.enqueueForSubmission,
      {
        sessionSlug: args.sessionSlug,
        clientKey: args.clientKey,
        submissionId: submission.id,
        tone: args.tone,
      },
    );

    return { submission, feedback };
  },
});
