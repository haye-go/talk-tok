import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { rateLimiter } from "./components";
import { createDefaultQuestionForSession } from "./sessionQuestions";
import { assertCanRequestRecategorisation } from "./questionCapabilities";
import { requireInstructorPreviewPassword } from "./previewAuthGuard";

const MAX_REASON_LENGTH = 1000;
const REQUEST_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 3;
const DEFAULT_LIST_LIMIT = 80;
const MAX_LIST_LIMIT = 200;

function normalizeSessionSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeReason(value: string) {
  const reason = value.trim().replace(/\s+/g, " ");

  if (reason.length < 5) {
    throw new Error("Recategorisation reason must be at least 5 characters.");
  }

  if (reason.length > MAX_REASON_LENGTH) {
    throw new Error(`Recategorisation reason must be ${MAX_REASON_LENGTH} characters or fewer.`);
  }

  return reason;
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

function toPublicRequest(request: Doc<"recategorizationRequests">) {
  return {
    id: request._id,
    sessionId: request.sessionId,
    questionId: request.questionId,
    submissionId: request.submissionId,
    participantId: request.participantId,
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

async function questionIdForSubmission(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  submission: Doc<"submissions">,
) {
  if (submission.questionId) {
    return submission.questionId;
  }

  return await createDefaultQuestionForSession(ctx, session);
}

async function latestAssignmentForQuestion(
  ctx: QueryCtx | MutationCtx,
  submissionId: Id<"submissions">,
  questionId: Id<"sessionQuestions">,
) {
  const assignments = await ctx.db
    .query("submissionCategories")
    .withIndex("by_submission", (q) => q.eq("submissionId", submissionId))
    .order("desc")
    .take(8);

  return assignments.find(
    (assignment) => !assignment.questionId || assignment.questionId === questionId,
  );
}

async function assertRequestAllowed(
  ctx: QueryCtx | MutationCtx,
  participantId: Id<"participants">,
) {
  const now = Date.now();
  const recent = await ctx.db
    .query("recategorizationRequests")
    .withIndex("by_participant", (q) => q.eq("participantId", participantId))
    .order("desc")
    .take(MAX_REQUESTS_PER_WINDOW + 5);
  const recentInWindow = recent.filter((request) => now - request.createdAt <= REQUEST_WINDOW_MS);

  if (recentInWindow.length >= MAX_REQUESTS_PER_WINDOW) {
    throw new Error("You are requesting recategorisation too quickly. Try again shortly.");
  }
}

export const request = mutation({
  args: {
    sessionSlug: v.string(),
    clientKey: v.string(),
    submissionId: v.id("submissions"),
    requestedCategoryId: v.optional(v.id("categories")),
    suggestedCategoryName: v.optional(v.string()),
    reason: v.string(),
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

    await rateLimiter.limit(ctx, "recategorisationRequest", {
      key: participant._id,
      throws: true,
    });

    const submission = await ctx.db.get(args.submissionId);

    if (
      !submission ||
      submission.sessionId !== session._id ||
      submission.participantId !== participant._id
    ) {
      throw new Error("Submission not found for this participant.");
    }

    if (!args.requestedCategoryId && !args.suggestedCategoryName?.trim()) {
      throw new Error("Choose a category or suggest a category name.");
    }

    const questionId = await questionIdForSubmission(ctx, session, submission);
    const question = await ctx.db.get(questionId);

    if (!question || question.sessionId !== session._id) {
      throw new Error("Question not found for this submission.");
    }

    assertCanRequestRecategorisation(session, question);

    if (args.requestedCategoryId) {
      const requested = await ctx.db.get(args.requestedCategoryId);

      if (
        !requested ||
        requested.sessionId !== session._id ||
        requested.status !== "active" ||
        (requested.questionId && requested.questionId !== questionId)
      ) {
        throw new Error("Requested category not found in this session.");
      }
    }

    await assertRequestAllowed(ctx, participant._id);

    const currentAssignment = await latestAssignmentForQuestion(ctx, submission._id, questionId);
    const now = Date.now();
    const requestId = await ctx.db.insert("recategorizationRequests", {
      sessionId: session._id,
      questionId,
      submissionId: submission._id,
      participantId: participant._id,
      currentCategoryId: currentAssignment?.categoryId,
      requestedCategoryId: args.requestedCategoryId,
      suggestedCategoryName: args.suggestedCategoryName?.trim(),
      reason: normalizeReason(args.reason),
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    if (currentAssignment) {
      await ctx.db.patch(currentAssignment._id, { status: "recategorization_requested" });
    }

    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      questionId,
      actorType: "participant",
      actorParticipantId: participant._id,
      action: "recategorization.requested",
      targetType: "recategorizationRequest",
      targetId: requestId,
      metadataJson: {
        questionId,
        submissionId: submission._id,
        requestedCategoryId: args.requestedCategoryId,
        suggestedCategoryName: args.suggestedCategoryName,
      },
    });

    return toPublicRequest((await ctx.db.get(requestId))!);
  },
});

export const decide = mutation({
  args: {
    previewPassword: v.string(),
    sessionSlug: v.string(),
    requestId: v.id("recategorizationRequests"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    categoryId: v.optional(v.id("categories")),
    instructorNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const session = await getSessionBySlug(ctx, args.sessionSlug);
    const requestDoc = await ctx.db.get(args.requestId);

    if (!session || !requestDoc || requestDoc.sessionId !== session._id) {
      throw new Error("Recategorisation request not found in this session.");
    }

    if (requestDoc.status !== "pending") {
      throw new Error("This recategorisation request has already been decided.");
    }

    const now = Date.now();
    const submission = await ctx.db.get(requestDoc.submissionId);

    if (!submission || submission.sessionId !== session._id) {
      throw new Error("Submission not found for this recategorisation request.");
    }

    const questionId =
      requestDoc.questionId ?? (await questionIdForSubmission(ctx, session, submission));

    if (args.decision === "approved") {
      const categoryId = args.categoryId ?? requestDoc.requestedCategoryId;

      if (!categoryId) {
        throw new Error("Approved recategorisation requires a target category.");
      }

      const category = await ctx.db.get(categoryId);

      if (
        !category ||
        category.sessionId !== session._id ||
        category.status !== "active" ||
        (category.questionId && category.questionId !== questionId)
      ) {
        throw new Error("Target category not found in this session.");
      }

      const existingAssignments = await ctx.db
        .query("submissionCategories")
        .withIndex("by_submission", (q) => q.eq("submissionId", requestDoc.submissionId))
        .take(8);
      const assignmentsForQuestion = existingAssignments.filter(
        (assignment) => !assignment.questionId || assignment.questionId === questionId,
      );

      for (const assignment of assignmentsForQuestion) {
        await ctx.db.delete(assignment._id);
      }

      await ctx.db.insert("submissionCategories", {
        sessionId: session._id,
        questionId,
        submissionId: requestDoc.submissionId,
        categoryId,
        confidence: 1,
        rationale: args.instructorNote ?? "Approved recategorisation request.",
        status: "confirmed",
        createdAt: now,
      });
    }

    await ctx.db.patch(requestDoc._id, {
      questionId: requestDoc.questionId ?? questionId,
      status: args.decision,
      instructorNote: args.instructorNote,
      decidedAt: now,
      updatedAt: now,
    });
    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      questionId,
      actorType: "instructor",
      action:
        args.decision === "approved" ? "recategorization.approved" : "recategorization.rejected",
      targetType: "recategorizationRequest",
      targetId: requestDoc._id,
      metadataJson: {
        questionId,
        submissionId: requestDoc.submissionId,
        categoryId: args.categoryId ?? requestDoc.requestedCategoryId,
      },
    });

    return toPublicRequest((await ctx.db.get(requestDoc._id))!);
  },
});

export const listForSession = query({
  args: {
    previewPassword: v.string(),
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const limit = Math.min(MAX_LIST_LIMIT, Math.max(1, args.limit ?? DEFAULT_LIST_LIMIT));
    const question = args.questionId ? await ctx.db.get(args.questionId) : null;

    if (args.questionId && (!question || question.sessionId !== session._id)) {
      throw new Error("Question not found in this session.");
    }

    if (args.questionId && args.status) {
      const requests = await ctx.db
        .query("recategorizationRequests")
        .withIndex("by_questionId_and_status", (q) =>
          q.eq("questionId", args.questionId).eq("status", args.status!),
        )
        .order("desc")
        .take(limit);

      return requests.map(toPublicRequest);
    }

    if (args.questionId) {
      const requests = await ctx.db
        .query("recategorizationRequests")
        .withIndex("by_questionId", (q) => q.eq("questionId", args.questionId))
        .order("desc")
        .take(limit);

      return requests.map(toPublicRequest);
    }

    if (args.status) {
      const requests = await ctx.db
        .query("recategorizationRequests")
        .withIndex("by_session_and_status", (q) =>
          q.eq("sessionId", session._id).eq("status", args.status!),
        )
        .order("desc")
        .take(limit);

      return requests.map(toPublicRequest);
    }

    const requests = await ctx.db
      .query("recategorizationRequests")
      .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
      .order("desc")
      .take(limit);

    return requests.map(toPublicRequest);
  },
});
