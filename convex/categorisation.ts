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

type JsonRecord = Record<string, unknown>;

const MAX_CATEGORISATION_SUBMISSIONS = 120;

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
      type: "categorisation",
      status: "queued",
      requestedBy: "instructor",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
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

export const markJobProcessing = internalMutation({
  args: {
    jobId: v.id("aiJobs"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { status: "processing", updatedAt: Date.now() });
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

export const applyCategorisation = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    questionId: v.optional(v.id("sessionQuestions")),
    jobId: v.id("aiJobs"),
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
        existingForSession?.find((category) => !category.questionId || category.questionId === questionId);

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

    await ctx.db.patch(args.jobId, {
      status: "success",
      progressDone: assigned,
      progressTotal: args.assignments.length,
      updatedAt: now,
    });

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
          const submissionId = row.submissionId;

          if (typeof submissionId !== "string") {
            return null;
          }

          return {
            submissionId: submissionId as Id<"submissions">,
            categorySlug: slugify(stringOrFallback(row.categorySlug ?? row.categoryName, "")),
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
