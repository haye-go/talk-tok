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
import { createDefaultQuestionForSession } from "./sessionQuestions";
import { requireInstructorPreviewPassword } from "./previewAuthGuard";

type JsonRecord = Record<string, unknown>;
type AssignmentDecision = "auto" | "review" | "none";

const MAX_CATEGORISATION_SUBMISSIONS = 120;
const AUTO_ASSIGNMENT_CONFIDENCE = 0.8;

const categoryGenerationModeValidator = v.union(
  v.literal("append"),
  v.literal("full_regeneration"),
);
const categoryAssignmentScopeValidator = v.union(
  v.literal("all_posts"),
  v.literal("uncategorised_posts"),
);
const assignmentDecisionValidator = v.union(
  v.literal("auto"),
  v.literal("review"),
  v.literal("none"),
);
const classifiedTypeValidator = v.union(v.literal("question"), v.literal("comment"));

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

  return slug || "category";
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function stringOrFallback(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function numberOrDefault(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampConfidence(value: unknown) {
  return Math.min(1, Math.max(0, numberOrDefault(value, 0.7)));
}

function assignmentDecisionFrom(value: unknown, confidence: number): AssignmentDecision {
  if (value === "auto" || value === "review" || value === "none") {
    return value;
  }

  return confidence >= AUTO_ASSIGNMENT_CONFIDENCE ? "auto" : "review";
}

function classifiedTypeFrom(value: unknown): "question" | "comment" {
  return value === "question" ? "question" : "comment";
}

async function getSessionBySlug(ctx: QueryCtx | MutationCtx, sessionSlug: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_slug", (q) => q.eq("slug", normalizeSessionSlug(sessionSlug)))
    .unique();
}

async function resolveQuestionIdForRead(
  ctx: QueryCtx,
  session: Doc<"sessions">,
  questionId?: Id<"sessionQuestions">,
) {
  if (questionId) {
    const question = await ctx.db.get(questionId);

    if (!question || question.sessionId !== session._id) {
      throw new Error("Question not found in this session.");
    }

    return question._id;
  }

  return session.currentQuestionId;
}

async function resolveQuestionIdForWrite(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  questionId?: Id<"sessionQuestions">,
) {
  if (questionId) {
    const question = await ctx.db.get(questionId);

    if (!question || question.sessionId !== session._id) {
      throw new Error("Question not found in this session.");
    }

    return question._id;
  }

  return await createDefaultQuestionForSession(ctx, session);
}

function toPublicCategory(category: Doc<"categories">) {
  return {
    id: category._id,
    questionId: category.questionId,
    slug: category.slug,
    name: category.name,
    description: category.description,
    color: category.color,
    parentCategoryId: category.parentCategoryId,
    source: category.source,
    status: category.status,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

function toPublicAssignment(
  assignment: Doc<"submissionCategories">,
  category: Doc<"categories"> | null,
) {
  return {
    id: assignment._id,
    submissionId: assignment.submissionId,
    categoryId: assignment.categoryId,
    categorySlug: category?.slug,
    categoryName: category?.name,
    categoryColor: category?.color,
    categoryStatus: category?.status,
    questionId: assignment.questionId,
    confidence: assignment.confidence,
    rationale: assignment.rationale,
    status: assignment.status,
    createdAt: assignment.createdAt,
  };
}

function toPublicReview(
  review: Doc<"categoryAssignmentReviews">,
  category: Doc<"categories"> | null,
  submission: Doc<"submissions"> | null,
) {
  return {
    id: review._id,
    sessionId: review.sessionId,
    questionId: review.questionId,
    submissionId: review.submissionId,
    submissionBody: submission?.body,
    submissionKind: submission?.kind,
    suggestedCategoryId: review.suggestedCategoryId,
    suggestedCategorySlug: category?.slug,
    suggestedCategoryName: category?.name,
    decision: review.decision,
    rationale: review.rationale,
    status: review.status,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

async function loadCategoriesForQuestion(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"sessions">,
  questionId?: Id<"sessionQuestions">,
) {
  let categories = questionId
    ? await ctx.db
        .query("categories")
        .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
        .take(100)
    : await ctx.db
        .query("categories")
        .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
        .take(100);

  if (questionId && categories.length === 0) {
    categories = (
      await ctx.db
        .query("categories")
        .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
        .take(100)
    ).filter((category) => !category.questionId);
  }

  return categories.filter((category) => category.sessionId === sessionId);
}

async function createCategorisationJob(
  ctx: MutationCtx,
  args: {
    session: Doc<"sessions">;
    questionId: Id<"sessionQuestions">;
    action: string;
    metadataJson: JsonRecord;
  },
) {
  await rateLimiter.limit(ctx, "heavyAiAction", {
    key: `${args.action}:${args.session._id}:${args.questionId}`,
    throws: true,
  });
  await rateLimiter.limit(ctx, "dailyAiAction", { key: args.session._id, throws: true });

  const budget = await ctx.runQuery(internal.budget.checkSessionBudget, {
    sessionId: args.session._id,
    feature: "categorisation",
  });

  if (!budget.allowed) {
    throw new Error("AI budget hard stop is active for this session.");
  }

  const now = Date.now();
  const jobId = await ctx.db.insert("aiJobs", {
    sessionId: args.session._id,
    questionId: args.questionId,
    type: "categorisation",
    status: "queued",
    requestedBy: "instructor",
    createdAt: now,
    updatedAt: now,
  });

  await ctx.runMutation(internal.audit.record, {
    sessionId: args.session._id,
    questionId: args.questionId,
    actorType: "instructor",
    action: args.action,
    targetType: "aiJob",
    targetId: jobId,
    metadataJson: { ...args.metadataJson, budget },
  });

  return jobId;
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

    const questionId = await resolveQuestionIdForRead(ctx, session, args.questionId);
    let categories = questionId
      ? await ctx.db
          .query("categories")
          .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
          .take(100)
      : await ctx.db
          .query("categories")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .take(100);

    if (questionId && categories.length === 0) {
      categories = (
        await ctx.db
          .query("categories")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .take(100)
      ).filter((category) => !category.questionId);
    }

    return categories
      .filter((category) => category.sessionId === session._id && category.status === "active")
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(toPublicCategory);
  },
});

export const listAssignmentsForSession = query({
  args: {
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const questionId = await resolveQuestionIdForRead(ctx, session, args.questionId);
    const submissions = questionId
      ? await ctx.db
          .query("submissions")
          .withIndex("by_questionId_and_createdAt", (q) => q.eq("questionId", questionId))
          .order("desc")
          .take(MAX_CATEGORISATION_SUBMISSIONS)
      : await ctx.db
          .query("submissions")
          .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
          .order("desc")
          .take(MAX_CATEGORISATION_SUBMISSIONS);
    const assignments = [];

    for (const submission of submissions) {
      const rows = await ctx.db
        .query("submissionCategories")
        .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
        .take(8);

      for (const row of rows) {
        if (questionId && row.questionId && row.questionId !== questionId) {
          continue;
        }

        assignments.push(toPublicAssignment(row, await ctx.db.get(row.categoryId)));
      }
    }

    return assignments;
  },
});

export const listAssignmentReviews = query({
  args: {
    previewPassword: v.string(),
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("resolved"), v.literal("dismissed")),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const questionId = await resolveQuestionIdForRead(ctx, session, args.questionId);
    const status = args.status ?? "pending";
    const limit = Math.min(100, Math.max(1, args.limit ?? 50));
    const reviews = questionId
      ? await ctx.db
          .query("categoryAssignmentReviews")
          .withIndex("by_questionId_and_status", (q) =>
            q.eq("questionId", questionId).eq("status", status),
          )
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("categoryAssignmentReviews")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .order("desc")
          .take(limit);
    const scoped = reviews.filter(
      (review) =>
        review.sessionId === session._id &&
        review.status === status &&
        (!questionId || !review.questionId || review.questionId === questionId),
    );

    return await Promise.all(
      scoped.map(async (review) =>
        toPublicReview(
          review,
          review.suggestedCategoryId ? await ctx.db.get(review.suggestedCategoryId) : null,
          await ctx.db.get(review.submissionId),
        ),
      ),
    );
  },
});

export const generateCategories = mutation({
  args: {
    previewPassword: v.string(),
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
    mode: categoryGenerationModeValidator,
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const questionId = await resolveQuestionIdForWrite(ctx, session, args.questionId);
    const jobId = await createCategorisationJob(ctx, {
      session,
      questionId,
      action:
        args.mode === "append"
          ? "generate_categories.append"
          : "generate_categories.full_regeneration",
      metadataJson: { questionId, mode: args.mode },
    });

    await aiWorkpool.enqueueAction(
      ctx,
      internal.categorisation.runGenerateCategories,
      {
        sessionId: session._id,
        questionId,
        jobId,
        mode: args.mode,
      },
      { name: "categorisation.runGenerateCategories", retry: true },
    );

    return await ctx.db.get(jobId);
  },
});

export const assignCategories = mutation({
  args: {
    previewPassword: v.string(),
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
    scope: categoryAssignmentScopeValidator,
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const questionId = await resolveQuestionIdForWrite(ctx, session, args.questionId);
    const jobId = await createCategorisationJob(ctx, {
      session,
      questionId,
      action:
        args.scope === "uncategorised_posts"
          ? "assign_categories.uncategorised_posts"
          : "assign_categories.all_posts",
      metadataJson: { questionId, scope: args.scope },
    });

    await aiWorkpool.enqueueAction(
      ctx,
      internal.categorisation.runAssignCategories,
      {
        sessionId: session._id,
        questionId,
        jobId,
        scope: args.scope,
      },
      { name: "categorisation.runAssignCategories", retry: true },
    );

    return await ctx.db.get(jobId);
  },
});

export const setSubmissionCategory = mutation({
  args: {
    previewPassword: v.string(),
    sessionSlug: v.string(),
    submissionId: v.id("submissions"),
    categoryId: v.optional(v.id("categories")),
    rationale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const session = await getSessionBySlug(ctx, args.sessionSlug);
    const submission = await ctx.db.get(args.submissionId);

    if (!session || !submission || submission.sessionId !== session._id) {
      throw new Error("Submission not found in this session.");
    }

    const questionId = await resolveQuestionIdForWrite(ctx, session, submission.questionId);
    const now = Date.now();

    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);

      if (
        !category ||
        category.sessionId !== session._id ||
        category.status !== "active" ||
        (category.questionId && category.questionId !== questionId)
      ) {
        throw new Error("Category not found in this session.");
      }
    }

    const existingAssignments = await ctx.db
      .query("submissionCategories")
      .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
      .take(8);

    for (const assignment of existingAssignments) {
      if (!assignment.questionId || assignment.questionId === questionId) {
        await ctx.db.delete(assignment._id);
      }
    }

    if (args.categoryId) {
      await ctx.db.insert("submissionCategories", {
        sessionId: session._id,
        questionId,
        submissionId: submission._id,
        categoryId: args.categoryId,
        confidence: 1,
        rationale: args.rationale?.trim() || "Instructor assigned category.",
        status: "confirmed",
        createdAt: now,
      });
    }

    const reviews = await ctx.db
      .query("categoryAssignmentReviews")
      .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
      .take(20);

    for (const review of reviews) {
      if (!review.questionId || review.questionId === questionId) {
        await ctx.db.patch(review._id, { status: "resolved", updatedAt: now });
      }
    }

    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      questionId,
      actorType: "instructor",
      action: args.categoryId ? "category_assignment.manually_set" : "category_assignment.cleared",
      targetType: "submission",
      targetId: submission._id,
      metadataJson: { categoryId: args.categoryId },
    });

    return { submissionId: submission._id, categoryId: args.categoryId ?? null };
  },
});

export const setSubmissionType = mutation({
  args: {
    sessionSlug: v.string(),
    submissionId: v.id("submissions"),
    classifiedType: classifiedTypeValidator,
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);
    const submission = await ctx.db.get(args.submissionId);

    if (!session || !submission || submission.sessionId !== session._id) {
      throw new Error("Submission not found in this session.");
    }

    const questionId = await resolveQuestionIdForWrite(ctx, session, submission.questionId);
    await ctx.db.patch(submission._id, {
      classifiedType: args.classifiedType,
      classifiedTypeSource: "instructor",
    });
    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      questionId,
      actorType: "instructor",
      action: "submission_type.manually_set",
      targetType: "submission",
      targetId: submission._id,
      metadataJson: { classifiedType: args.classifiedType },
    });

    return await ctx.db.get(submission._id);
  },
});

export const triggerForSession = mutation({
  args: {
    sessionSlug: v.string(),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const questionId = await resolveQuestionIdForWrite(ctx, session, args.questionId);

    await rateLimiter.limit(ctx, "heavyAiAction", {
      key: `categorisation:${session._id}:${questionId}`,
      throws: true,
    });
    await rateLimiter.limit(ctx, "dailyAiAction", { key: session._id, throws: true });

    const budget = await ctx.runQuery(internal.budget.checkSessionBudget, {
      sessionId: session._id,
      feature: "categorisation",
    });

    if (!budget.allowed) {
      throw new Error("AI budget hard stop is active for this session.");
    }

    const now = Date.now();
    const jobId = await ctx.db.insert("aiJobs", {
      sessionId: session._id,
      questionId,
      type: "categorisation",
      status: "queued",
      requestedBy: "instructor",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      questionId,
      actorType: "instructor",
      action: "categorisation.triggered",
      targetType: "aiJob",
      targetId: jobId,
      metadataJson: { budget, questionId },
    });

    await aiWorkpool.enqueueAction(
      ctx,
      internal.categorisation.runForSession,
      {
        sessionId: session._id,
        questionId,
        jobId,
      },
      { name: "categorisation.runForSession", retry: true },
    );

    return await ctx.db.get(jobId);
  },
});

export const loadSessionContext = internalQuery({
  args: {
    sessionId: v.id("sessions"),
    questionId: v.optional(v.id("sessionQuestions")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);

    if (!session) {
      throw new Error("Session not found.");
    }

    const questionId = args.questionId ?? session.currentQuestionId;
    const question = questionId ? await ctx.db.get(questionId) : null;

    if (questionId && (!question || question.sessionId !== session._id)) {
      throw new Error("Question not found in this session.");
    }

    let categories = questionId
      ? await ctx.db
          .query("categories")
          .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
          .take(100)
      : await ctx.db
          .query("categories")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .take(100);

    if (questionId && categories.length === 0) {
      categories = (
        await ctx.db
          .query("categories")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .take(100)
      ).filter((category) => !category.questionId);
    }
    const submissions = questionId
      ? await ctx.db
          .query("submissions")
          .withIndex("by_questionId_and_createdAt", (q) => q.eq("questionId", questionId))
          .order("asc")
          .take(MAX_CATEGORISATION_SUBMISSIONS)
      : await ctx.db
          .query("submissions")
          .withIndex("by_session_and_created_at", (q) => q.eq("sessionId", session._id))
          .order("asc")
          .take(MAX_CATEGORISATION_SUBMISSIONS);

    return { session, question, categories, submissions };
  },
});

export const loadCategoryGenerationContext = internalQuery({
  args: {
    sessionId: v.id("sessions"),
    questionId: v.id("sessionQuestions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);

    if (!session) {
      throw new Error("Session not found.");
    }

    const question = await ctx.db.get(args.questionId);

    if (!question || question.sessionId !== session._id) {
      throw new Error("Question not found in this session.");
    }

    const categories = await loadCategoriesForQuestion(ctx, session._id, question._id);
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_questionId_and_createdAt", (q) => q.eq("questionId", question._id))
      .order("asc")
      .take(MAX_CATEGORISATION_SUBMISSIONS);

    return { session, question, categories, submissions };
  },
});

export const loadAssignmentContext = internalQuery({
  args: {
    sessionId: v.id("sessions"),
    questionId: v.id("sessionQuestions"),
    scope: categoryAssignmentScopeValidator,
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);

    if (!session) {
      throw new Error("Session not found.");
    }

    const question = await ctx.db.get(args.questionId);

    if (!question || question.sessionId !== session._id) {
      throw new Error("Question not found in this session.");
    }

    const categories = (await loadCategoriesForQuestion(ctx, session._id, question._id)).filter(
      (category) => category.status === "active",
    );
    const candidates = await ctx.db
      .query("submissions")
      .withIndex("by_questionId_and_createdAt", (q) => q.eq("questionId", question._id))
      .order("asc")
      .take(MAX_CATEGORISATION_SUBMISSIONS);
    const submissions = [];

    for (const submission of candidates) {
      if (args.scope === "all_posts") {
        submissions.push(submission);
        continue;
      }

      const existing = await ctx.db
        .query("submissionCategories")
        .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
        .take(8);
      const hasQuestionAssignment = existing.some(
        (assignment) => !assignment.questionId || assignment.questionId === question._id,
      );

      if (!hasQuestionAssignment) {
        submissions.push(submission);
      }
    }

    return { session, question, categories, submissions };
  },
});

export const loadSubmissionAutomationContext = internalQuery({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);

    if (!submission) {
      throw new Error("Submission not found.");
    }

    const session = await ctx.db.get(submission.sessionId);

    if (!session) {
      throw new Error("Session not found.");
    }

    const questionId = submission.questionId ?? session.currentQuestionId;
    const question = questionId ? await ctx.db.get(questionId) : null;

    if (questionId && (!question || question.sessionId !== session._id)) {
      throw new Error("Question not found in this session.");
    }

    const categories = questionId
      ? (await loadCategoriesForQuestion(ctx, session._id, questionId)).filter(
          (category) => category.status === "active",
        )
      : [];
    const existingAssignments = await ctx.db
      .query("submissionCategories")
      .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
      .take(8);
    const hasAssignment = existingAssignments.some(
      (assignment) => !questionId || !assignment.questionId || assignment.questionId === questionId,
    );

    return {
      session,
      question,
      questionId,
      submission,
      categories,
      hasAssignment,
    };
  },
});

export const applyGeneratedCategories = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    questionId: v.id("sessionQuestions"),
    jobId: v.id("aiJobs"),
    mode: categoryGenerationModeValidator,
    categories: v.array(
      v.object({
        slug: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        color: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);

    if (!session) {
      throw new Error("Session not found.");
    }

    const now = Date.now();
    const returnedSlugs = new Set<string>();
    let changed = 0;

    for (const categoryInput of args.categories) {
      const slug = slugify(categoryInput.slug || categoryInput.name);
      returnedSlugs.add(slug);
      const existingForQuestion = await ctx.db
        .query("categories")
        .withIndex("by_questionId_and_slug", (q) =>
          q.eq("questionId", args.questionId).eq("slug", slug),
        )
        .unique();
      const existingForSession = existingForQuestion
        ? null
        : await ctx.db
            .query("categories")
            .withIndex("by_session_slug", (q) => q.eq("sessionId", args.sessionId).eq("slug", slug))
            .take(10);
      const existing =
        existingForQuestion ??
        existingForSession?.find(
          (category) => !category.questionId || category.questionId === args.questionId,
        );

      if (existing) {
        await ctx.db.patch(existing._id, {
          questionId: existing.questionId ?? args.questionId,
          name: categoryInput.name,
          description: categoryInput.description,
          color: categoryInput.color,
          source: existing.source === "instructor" ? "hybrid" : existing.source,
          status: "active",
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("categories", {
          sessionId: args.sessionId,
          questionId: args.questionId,
          slug,
          name: categoryInput.name,
          description: categoryInput.description,
          color: categoryInput.color,
          source: "llm",
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
      }
      changed += 1;
    }

    if (args.mode === "full_regeneration") {
      const currentCategories = await ctx.db
        .query("categories")
        .withIndex("by_questionId", (q) => q.eq("questionId", args.questionId))
        .take(100);

      for (const category of currentCategories) {
        if (category.status === "active" && !returnedSlugs.has(category.slug)) {
          await ctx.db.patch(category._id, { status: "archived", updatedAt: now });
          changed += 1;
        }
      }
    }

    await ctx.db.patch(args.jobId, {
      status: "success",
      progressDone: changed,
      progressTotal: args.categories.length,
      updatedAt: now,
    });

    return { changed };
  },
});

export const applyAssignments = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    questionId: v.id("sessionQuestions"),
    jobId: v.optional(v.id("aiJobs")),
    assignments: v.array(
      v.object({
        submissionId: v.id("submissions"),
        categorySlug: v.optional(v.string()),
        decision: assignmentDecisionValidator,
        confidence: v.optional(v.number()),
        rationale: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);

    if (!session) {
      throw new Error("Session not found.");
    }

    const categories = (
      await loadCategoriesForQuestion(ctx, args.sessionId, args.questionId)
    ).filter((category) => category.status === "active");
    const categoriesBySlug = new Map(categories.map((category) => [category.slug, category]));
    const now = Date.now();
    let assigned = 0;
    let review = 0;

    for (const assignmentInput of args.assignments) {
      const submission = await ctx.db.get(assignmentInput.submissionId);

      if (!submission || submission.sessionId !== args.sessionId) {
        continue;
      }

      if (submission.questionId && submission.questionId !== args.questionId) {
        continue;
      }

      const slug = assignmentInput.categorySlug ? slugify(assignmentInput.categorySlug) : "";
      const category = slug ? categoriesBySlug.get(slug) : undefined;
      const existingAssignments = await ctx.db
        .query("submissionCategories")
        .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
        .take(8);
      const assignmentsForQuestion = existingAssignments.filter(
        (existing) => !existing.questionId || existing.questionId === args.questionId,
      );

      if (
        assignmentsForQuestion.some(
          (existing) =>
            existing.status === "confirmed" || existing.status === "recategorization_requested",
        )
      ) {
        continue;
      }

      if (assignmentInput.decision === "auto" && category) {
        for (const existing of assignmentsForQuestion) {
          await ctx.db.delete(existing._id);
        }

        await ctx.db.insert("submissionCategories", {
          sessionId: args.sessionId,
          questionId: args.questionId,
          submissionId: submission._id,
          categoryId: category._id,
          confidence: clampConfidence(assignmentInput.confidence),
          rationale: assignmentInput.rationale,
          status: "suggested",
          createdAt: now,
        });
        assigned += 1;
        continue;
      }

      const existingReviews = await ctx.db
        .query("categoryAssignmentReviews")
        .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
        .take(20);
      const existingPending = existingReviews.find(
        (row) =>
          row.status === "pending" && (!row.questionId || row.questionId === args.questionId),
      );
      const reviewPatch = {
        questionId: args.questionId,
        suggestedCategoryId: category?._id,
        decision: (assignmentInput.decision === "none" ? "none" : "review") as "none" | "review",
        rationale: assignmentInput.rationale,
        status: "pending" as const,
        updatedAt: now,
      };

      if (existingPending) {
        await ctx.db.patch(existingPending._id, reviewPatch);
      } else {
        await ctx.db.insert("categoryAssignmentReviews", {
          sessionId: args.sessionId,
          submissionId: submission._id,
          createdAt: now,
          ...reviewPatch,
        });
      }
      review += 1;
    }

    if (args.jobId) {
      await ctx.db.patch(args.jobId, {
        status: "success",
        progressDone: assigned,
        progressTotal: args.assignments.length,
        updatedAt: now,
      });
    }

    return { assigned, review };
  },
});

export const applySubmissionType = internalMutation({
  args: {
    submissionId: v.id("submissions"),
    classifiedType: classifiedTypeValidator,
    source: v.union(v.literal("llm"), v.literal("instructor")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.submissionId, {
      classifiedType: args.classifiedType,
      classifiedTypeSource: args.source,
    });

    return await ctx.db.get(args.submissionId);
  },
});

export const markJobProcessing = internalMutation({
  args: {
    jobId: v.id("aiJobs"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { status: "processing", updatedAt: Date.now() });
  },
});

export const markJobSuccess = internalMutation({
  args: {
    jobId: v.id("aiJobs"),
    progressDone: v.optional(v.number()),
    progressTotal: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "success",
      progressDone: args.progressDone,
      progressTotal: args.progressTotal,
      updatedAt: Date.now(),
    });
  },
});

export const markJobError = internalMutation({
  args: {
    jobId: v.id("aiJobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "error",
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const runGenerateCategories = internalAction({
  args: {
    sessionId: v.id("sessions"),
    questionId: v.id("sessionQuestions"),
    jobId: v.id("aiJobs"),
    mode: categoryGenerationModeValidator,
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.categorisation.markJobProcessing, { jobId: args.jobId });

    try {
      const { session, question, categories, submissions } = await ctx.runQuery(
        internal.categorisation.loadCategoryGenerationContext,
        { sessionId: args.sessionId, questionId: args.questionId },
      );

      if (submissions.length === 0) {
        await ctx.runMutation(internal.categorisation.markJobSuccess, {
          jobId: args.jobId,
          progressDone: 0,
          progressTotal: 0,
        });
        return;
      }

      const result = await ctx.runAction(internal.llm.runJson, {
        sessionId: session._id,
        feature: "categorisation",
        promptKey:
          args.mode === "append"
            ? "category.generate.append.v1"
            : "category.generate.full_regeneration.v1",
        variables: {
          sessionTitle: session.title,
          openingPrompt: question.prompt,
          categorySoftCap: session.categorySoftCap,
          existingCategoriesJson: JSON.stringify(
            categories.map((category) => ({
              slug: category.slug,
              name: category.name,
              description: category.description,
              status: category.status,
            })),
          ),
          submissionsJson: JSON.stringify(
            submissions.map((submission) => ({
              id: submission._id,
              body: submission.body,
              kind: submission.kind,
              wordCount: submission.wordCount,
            })),
          ),
        },
      });
      const data = asRecord(result.data);
      const rawCategories = Array.isArray(data.categories) ? data.categories : [];
      const parsedCategories = rawCategories.map((raw, index) => {
        const row = asRecord(raw);
        const name = stringOrFallback(row.name, `Category ${index + 1}`);

        return {
          slug: slugify(stringOrFallback(row.slug, name)),
          name,
          description: typeof row.description === "string" ? row.description : undefined,
          color: typeof row.color === "string" ? row.color : undefined,
        };
      });

      await ctx.runMutation(internal.categorisation.applyGeneratedCategories, {
        sessionId: session._id,
        questionId: question._id,
        jobId: args.jobId,
        mode: args.mode,
        categories: parsedCategories,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Category generation failed.";
      await ctx.runMutation(internal.categorisation.markJobError, {
        jobId: args.jobId,
        error: message,
      });
      throw error;
    }
  },
});

export const runAssignCategories = internalAction({
  args: {
    sessionId: v.id("sessions"),
    questionId: v.id("sessionQuestions"),
    jobId: v.id("aiJobs"),
    scope: categoryAssignmentScopeValidator,
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.categorisation.markJobProcessing, { jobId: args.jobId });

    try {
      const { session, question, categories, submissions } = await ctx.runQuery(
        internal.categorisation.loadAssignmentContext,
        { sessionId: args.sessionId, questionId: args.questionId, scope: args.scope },
      );

      if (categories.length === 0 || submissions.length === 0) {
        await ctx.runMutation(internal.categorisation.markJobSuccess, {
          jobId: args.jobId,
          progressDone: 0,
          progressTotal: submissions.length,
        });
        return;
      }

      const result = await ctx.runAction(internal.llm.runJson, {
        sessionId: session._id,
        feature: "categorisation",
        promptKey: "category.assign.batch.v1",
        variables: {
          sessionTitle: session.title,
          openingPrompt: question.prompt,
          assignmentScope: args.scope,
          categoriesJson: JSON.stringify(
            categories.map((category) => ({
              slug: category.slug,
              name: category.name,
              description: category.description,
            })),
          ),
          submissionsJson: JSON.stringify(
            submissions.map((submission) => ({
              id: submission._id,
              body: submission.body,
              kind: submission.kind,
              wordCount: submission.wordCount,
            })),
          ),
        },
      });
      const data = asRecord(result.data);
      const rawAssignments = Array.isArray(data.assignments) ? data.assignments : [];
      const parsedAssignments = rawAssignments
        .map((raw) => {
          const row = asRecord(raw);
          const submissionId = row.submissionId ?? row.submission_id;

          if (typeof submissionId !== "string") {
            return null;
          }

          const confidence = clampConfidence(row.confidence);
          const categorySlug = stringOrFallback(
            row.categorySlug ?? row.category_slug ?? row.categoryName ?? row.category_name,
            "",
          );

          return {
            submissionId: submissionId as Id<"submissions">,
            categorySlug: categorySlug ? slugify(categorySlug) : undefined,
            decision: assignmentDecisionFrom(row.decision, confidence),
            confidence,
            rationale: typeof row.rationale === "string" ? row.rationale : undefined,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row));

      await ctx.runMutation(internal.categorisation.applyAssignments, {
        sessionId: session._id,
        questionId: question._id,
        jobId: args.jobId,
        assignments: parsedAssignments,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Category assignment failed.";
      await ctx.runMutation(internal.categorisation.markJobError, {
        jobId: args.jobId,
        error: message,
      });
      throw error;
    }
  },
});

export const autoAssignSubmission = internalAction({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const { session, question, questionId, submission, categories, hasAssignment } =
      await ctx.runQuery(internal.categorisation.loadSubmissionAutomationContext, {
        submissionId: args.submissionId,
      });

    if (!questionId || hasAssignment) {
      return { skipped: true };
    }

    if (submission.kind === "reply" || submission.kind === "fight_me_turn") {
      return { skipped: true };
    }

    const budget = await ctx.runQuery(internal.budget.checkSessionBudget, {
      sessionId: session._id,
      feature: "categorisation_auto_assign",
    });

    if (!budget.allowed) {
      return { skipped: true, reason: "budget" };
    }

    const result = await ctx.runAction(internal.llm.runJson, {
      sessionId: session._id,
      questionId,
      feature: "categorisation_auto_assign",
      promptKey: "categorisation.session.v1",
      variables: {
        sessionTitle: session.title,
        openingPrompt: question?.prompt ?? session.openingPrompt,
        categorySoftCap: session.categorySoftCap,
        existingCategoriesJson: JSON.stringify(
          categories.map((category) => ({
            slug: category.slug,
            name: category.name,
            description: category.description,
          })),
        ),
        submissionsJson: JSON.stringify([
          {
            id: submission._id,
            body: submission.body,
            kind: submission.kind,
            wordCount: submission.wordCount,
          },
        ]),
      },
    });
    const data = asRecord(result.data);
    const rawCategories = Array.isArray(data.categories) ? data.categories : [];
    const rawAssignments = Array.isArray(data.assignments) ? data.assignments : [];
    const parsedCategories = rawCategories.map((raw, index) => {
      const row = asRecord(raw);
      const name = stringOrFallback(row.name, `Category ${index + 1}`);

      return {
        slug: slugify(stringOrFallback(row.slug, name)),
        name,
        description: typeof row.description === "string" ? row.description : undefined,
        color: typeof row.color === "string" ? row.color : undefined,
      };
    });
    const fallbackCategories =
      parsedCategories.length > 0
        ? parsedCategories
        : categories.map((category) => ({
            slug: category.slug,
            name: category.name,
            description: category.description,
            color: category.color,
          }));
    const parsedAssignments = rawAssignments
      .map((raw) => {
        const row = asRecord(raw);
        const submissionId = row.submissionId ?? row.submission_id;

        if (submissionId !== submission._id) {
          return null;
        }

        const categorySlug = stringOrFallback(
          row.categorySlug ?? row.category_slug ?? row.categoryName ?? row.category_name,
          "",
        );

        if (!categorySlug) {
          return null;
        }

        return {
          submissionId: submission._id,
          categorySlug: slugify(categorySlug),
          confidence: clampConfidence(row.confidence),
          rationale: typeof row.rationale === "string" ? row.rationale : undefined,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    await ctx.runMutation(internal.categorisation.applyCategorisation, {
      sessionId: session._id,
      questionId,
      categories: fallbackCategories,
      assignments: parsedAssignments,
    });

    return { skipped: false };
  },
});

export const classifySubmissionType = internalAction({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const { session, question, questionId, submission } = await ctx.runQuery(
      internal.categorisation.loadSubmissionAutomationContext,
      {
        submissionId: args.submissionId,
      },
    );

    if (
      !questionId ||
      submission.classifiedTypeSource === "instructor" ||
      submission.classifiedType
    ) {
      return { skipped: true };
    }

    if (submission.kind === "reply" || submission.kind === "fight_me_turn") {
      return { skipped: true };
    }

    const budget = await ctx.runQuery(internal.budget.checkSessionBudget, {
      sessionId: session._id,
      feature: "submission_type_classification",
    });

    if (!budget.allowed) {
      return { skipped: true, reason: "budget" };
    }

    const result = await ctx.runAction(internal.llm.runJson, {
      sessionId: session._id,
      questionId,
      feature: "submission_type_classification",
      promptKey: "submission.type.classify.v1",
      variables: {
        sessionTitle: session.title,
        openingPrompt: question?.prompt ?? session.openingPrompt,
        submissionJson: JSON.stringify({
          id: submission._id,
          body: submission.body,
          kind: submission.kind,
          wordCount: submission.wordCount,
        }),
      },
    });
    const data = asRecord(result.data);

    await ctx.runMutation(internal.categorisation.applySubmissionType, {
      submissionId: submission._id,
      classifiedType: classifiedTypeFrom(data.type),
      source: "llm",
    });

    return { skipped: false };
  },
});

export const applyCategorisation = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    questionId: v.optional(v.id("sessionQuestions")),
    jobId: v.optional(v.id("aiJobs")),
    categories: v.array(
      v.object({
        slug: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        color: v.optional(v.string()),
      }),
    ),
    assignments: v.array(
      v.object({
        submissionId: v.id("submissions"),
        categorySlug: v.string(),
        confidence: v.number(),
        rationale: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);

    if (!session) {
      throw new Error("Session not found.");
    }

    const questionId = await resolveQuestionIdForWrite(ctx, session, args.questionId);
    const now = Date.now();
    const categoryIdsBySlug = new Map<string, Id<"categories">>();

    for (const categoryInput of args.categories) {
      const slug = slugify(categoryInput.slug || categoryInput.name);
      const existingForQuestion = await ctx.db
        .query("categories")
        .withIndex("by_questionId_and_slug", (q) => q.eq("questionId", questionId).eq("slug", slug))
        .unique();
      const existingForSession = existingForQuestion
        ? null
        : await ctx.db
            .query("categories")
            .withIndex("by_session_slug", (q) => q.eq("sessionId", args.sessionId).eq("slug", slug))
            .take(10);
      const existing =
        existingForQuestion ??
        existingForSession?.find(
          (category) => !category.questionId || category.questionId === questionId,
        );

      if (existing) {
        await ctx.db.patch(existing._id, {
          questionId: existing.questionId ?? questionId,
          name: categoryInput.name,
          description: categoryInput.description,
          color: categoryInput.color,
          source: existing.source === "instructor" ? "hybrid" : existing.source,
          status: "active",
          updatedAt: now,
        });
        categoryIdsBySlug.set(slug, existing._id);
      } else {
        const categoryId = await ctx.db.insert("categories", {
          sessionId: args.sessionId,
          questionId,
          slug,
          name: categoryInput.name,
          description: categoryInput.description,
          color: categoryInput.color,
          source: "llm",
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
        categoryIdsBySlug.set(slug, categoryId);
      }
    }

    let assigned = 0;

    for (const assignmentInput of args.assignments) {
      const submission = await ctx.db.get(assignmentInput.submissionId);

      if (!submission || submission.sessionId !== args.sessionId) {
        continue;
      }

      if (submission.questionId && submission.questionId !== questionId) {
        continue;
      }

      const categoryId = categoryIdsBySlug.get(slugify(assignmentInput.categorySlug));

      if (!categoryId) {
        continue;
      }

      const existingAssignments = await ctx.db
        .query("submissionCategories")
        .withIndex("by_submission", (q) => q.eq("submissionId", assignmentInput.submissionId))
        .take(8);
      const assignmentsForQuestion = existingAssignments.filter(
        (existing) => !existing.questionId || existing.questionId === questionId,
      );

      if (
        assignmentsForQuestion.some(
          (existing) =>
            existing.status === "confirmed" || existing.status === "recategorization_requested",
        )
      ) {
        continue;
      }

      for (const existing of assignmentsForQuestion) {
        await ctx.db.delete(existing._id);
      }

      await ctx.db.insert("submissionCategories", {
        sessionId: args.sessionId,
        questionId,
        submissionId: assignmentInput.submissionId,
        categoryId,
        confidence: clampConfidence(assignmentInput.confidence),
        rationale: assignmentInput.rationale,
        status: "suggested",
        createdAt: now,
      });
      assigned += 1;
    }

    if (args.jobId) {
      await ctx.db.patch(args.jobId, {
        status: "success",
        progressDone: assigned,
        progressTotal: args.assignments.length,
        updatedAt: now,
      });
    }

    return { assigned, categories: categoryIdsBySlug.size };
  },
});

export const runForSession = internalAction({
  args: {
    sessionId: v.id("sessions"),
    questionId: v.optional(v.id("sessionQuestions")),
    jobId: v.id("aiJobs"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.categorisation.markJobProcessing, { jobId: args.jobId });

    try {
      const { session, question, categories, submissions } = await ctx.runQuery(
        internal.categorisation.loadSessionContext,
        { sessionId: args.sessionId, questionId: args.questionId },
      );

      if (submissions.length === 0) {
        await ctx.runMutation(internal.categorisation.applyCategorisation, {
          sessionId: session._id,
          questionId: args.questionId,
          jobId: args.jobId,
          categories: [],
          assignments: [],
        });
        return;
      }

      const result = await ctx.runAction(internal.llm.runJson, {
        sessionId: session._id,
        feature: "categorisation",
        promptKey: "categorisation.session.v1",
        variables: {
          sessionTitle: session.title,
          openingPrompt: question?.prompt ?? session.openingPrompt,
          categorySoftCap: session.categorySoftCap,
          existingCategoriesJson: JSON.stringify(
            categories.map((category) => ({
              slug: category.slug,
              name: category.name,
              description: category.description,
            })),
          ),
          submissionsJson: JSON.stringify(
            submissions.map((submission) => ({
              id: submission._id,
              body: submission.body,
              kind: submission.kind,
              wordCount: submission.wordCount,
            })),
          ),
        },
      });
      const data = asRecord(result.data);
      const rawCategories = Array.isArray(data.categories) ? data.categories : [];
      const rawAssignments = Array.isArray(data.assignments) ? data.assignments : [];
      const parsedCategories = rawCategories.map((raw, index) => {
        const row = asRecord(raw);
        const name = stringOrFallback(row.name, `Category ${index + 1}`);

        return {
          slug: slugify(stringOrFallback(row.slug, name)),
          name,
          description: typeof row.description === "string" ? row.description : undefined,
          color: typeof row.color === "string" ? row.color : undefined,
        };
      });
      const parsedAssignments = rawAssignments
        .map((raw) => {
          const row = asRecord(raw);
          const submissionId = row.submissionId ?? row.submission_id;

          if (typeof submissionId !== "string") {
            return null;
          }

          return {
            submissionId: submissionId as Id<"submissions">,
            categorySlug: slugify(
              stringOrFallback(
                row.categorySlug ?? row.category_slug ?? row.categoryName ?? row.category_name,
                "",
              ),
            ),
            confidence: clampConfidence(row.confidence),
            rationale: typeof row.rationale === "string" ? row.rationale : undefined,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row));

      await ctx.runMutation(internal.categorisation.applyCategorisation, {
        sessionId: session._id,
        questionId: args.questionId,
        jobId: args.jobId,
        categories: parsedCategories,
        assignments: parsedAssignments,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Categorisation failed.";
      await ctx.runMutation(internal.categorisation.markJobError, {
        jobId: args.jobId,
        error: message,
      });
      throw error;
    }
  },
});
