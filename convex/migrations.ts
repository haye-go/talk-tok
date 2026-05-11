import { migrations } from "./components";
import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Doc, Id } from "./_generated/dataModel";

function slugify(value: string, fallback = "question") {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || fallback;
}

async function ensureDefaultQuestionForSession(
  ctx: GenericMutationCtx<DataModel>,
  session: Doc<"sessions">,
) {
  const now = Date.now();

  if (session.currentQuestionId) {
    const existing = await ctx.db.get(session.currentQuestionId);

    if (existing && existing.sessionId === session._id) {
      return existing._id;
    }
  }

  const currentQuestions = await ctx.db
    .query("sessionQuestions")
    .withIndex("by_sessionId_and_isCurrent", (q) =>
      q.eq("sessionId", session._id).eq("isCurrent", true),
    )
    .take(50);

  if (currentQuestions.length > 0) {
    const [current, ...duplicates] = currentQuestions;

    for (const duplicate of duplicates) {
      await ctx.db.patch(duplicate._id, { isCurrent: false, updatedAt: now });
    }

    await ctx.db.patch(session._id, {
      currentQuestionId: current._id,
      openingPrompt: current.prompt,
      updatedAt: now,
    });
    return current._id;
  }

  const existingQuestions = await ctx.db
    .query("sessionQuestions")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
    .take(50);

  if (existingQuestions.length > 0) {
    const question =
      existingQuestions.find((row) => row.status === "released") ?? existingQuestions[0];

    await ctx.db.patch(question._id, {
      status: "released",
      isCurrent: true,
      contributionsOpen: session.phase !== "closed",
      updatedAt: now,
      releasedAt: question.releasedAt ?? now,
    });
    await ctx.db.patch(session._id, {
      currentQuestionId: question._id,
      openingPrompt: question.prompt,
      updatedAt: now,
    });
    return question._id;
  }

  const title = "Opening question";
  const questionId = await ctx.db.insert("sessionQuestions", {
    sessionId: session._id,
    slug: slugify(title),
    title,
    prompt: session.openingPrompt,
    status: "released",
    isCurrent: true,
    contributionsOpen: session.phase !== "closed",
    peerResponsesVisible: session.visibilityMode === "raw_responses_visible",
    categoryBoardVisible:
      session.visibilityMode === "category_summary_only" ||
      session.visibilityMode === "raw_responses_visible",
    categorySummariesVisible:
      session.visibilityMode === "category_summary_only" ||
      session.visibilityMode === "raw_responses_visible",
    synthesisVisible: session.visibilityMode !== "private_until_released",
    personalReportsVisible: false,
    fightEnabled: session.fightMeEnabled,
    repliesEnabled: true,
    upvotesEnabled: true,
    createdAt: now,
    updatedAt: now,
    releasedAt: now,
  });

  await ctx.db.patch(session._id, {
    currentQuestionId: questionId,
    updatedAt: now,
  });

  return questionId;
}

export const backfillDefaultSessionQuestions = migrations.define({
  table: "sessions",
  batchSize: 25,
  migrateOne: async (ctx, session) => {
    await ensureDefaultQuestionForSession(ctx, session);
  },
});

export const backfillSubmissionQuestionIds = migrations.define({
  table: "submissions",
  batchSize: 50,
  migrateOne: async (ctx, submission) => {
    if (submission.questionId) {
      return;
    }

    const session = await ctx.db.get(submission.sessionId);

    if (!session) {
      return;
    }

    let questionId: Id<"sessionQuestions"> | undefined;

    if (submission.parentSubmissionId) {
      const parent = await ctx.db.get(submission.parentSubmissionId);

      if (parent?.sessionId === submission.sessionId) {
        questionId = parent.questionId;
      }
    }

    if (!questionId && submission.followUpPromptId) {
      const prompt = await ctx.db.get(submission.followUpPromptId);

      if (prompt?.sessionId === submission.sessionId) {
        questionId = prompt.questionId;
      }
    }

    questionId ??= await ensureDefaultQuestionForSession(ctx, session);

    return { questionId };
  },
});

export const backfillFollowUpPromptQuestionIds = migrations.define({
  table: "followUpPrompts",
  batchSize: 50,
  migrateOne: async (ctx, prompt) => {
    if (prompt.questionId) {
      return;
    }

    const session = await ctx.db.get(prompt.sessionId);

    if (!session) {
      return;
    }

    return {
      questionId: await ensureDefaultQuestionForSession(ctx, session),
    };
  },
});

export const backfillFollowUpTargetQuestionIds = migrations.define({
  table: "followUpTargets",
  batchSize: 50,
  migrateOne: async (ctx, target) => {
    if (target.questionId) {
      return;
    }

    const prompt = await ctx.db.get(target.followUpPromptId);

    if (prompt?.questionId && prompt.sessionId === target.sessionId) {
      return { questionId: prompt.questionId };
    }

    const session = await ctx.db.get(target.sessionId);

    if (!session) {
      return;
    }

    return {
      questionId: await ensureDefaultQuestionForSession(ctx, session),
    };
  },
});

export const backfillCategoryQuestionIds = migrations.define({
  table: "categories",
  batchSize: 50,
  migrateOne: async (ctx, category) => {
    if (category.questionId) {
      return;
    }

    const session = await ctx.db.get(category.sessionId);

    if (!session) {
      return;
    }

    return {
      questionId: await ensureDefaultQuestionForSession(ctx, session),
    };
  },
});

export const backfillSubmissionCategoryQuestionIds = migrations.define({
  table: "submissionCategories",
  batchSize: 50,
  migrateOne: async (ctx, assignment) => {
    if (assignment.questionId) {
      return;
    }

    const submission = await ctx.db.get(assignment.submissionId);

    if (submission?.questionId && submission.sessionId === assignment.sessionId) {
      return { questionId: submission.questionId };
    }

    const category = await ctx.db.get(assignment.categoryId);

    if (category?.questionId && category.sessionId === assignment.sessionId) {
      return { questionId: category.questionId };
    }

    const session = await ctx.db.get(assignment.sessionId);

    if (!session) {
      return;
    }

    return {
      questionId: await ensureDefaultQuestionForSession(ctx, session),
    };
  },
});

export const backfillRecategorizationRequestQuestionIds = migrations.define({
  table: "recategorizationRequests",
  batchSize: 50,
  migrateOne: async (ctx, request) => {
    if (request.questionId) {
      return;
    }

    const submission = await ctx.db.get(request.submissionId);

    if (submission?.questionId && submission.sessionId === request.sessionId) {
      return { questionId: submission.questionId };
    }

    if (request.currentCategoryId) {
      const currentCategory = await ctx.db.get(request.currentCategoryId);

      if (currentCategory?.questionId && currentCategory.sessionId === request.sessionId) {
        return { questionId: currentCategory.questionId };
      }
    }

    if (request.requestedCategoryId) {
      const requestedCategory = await ctx.db.get(request.requestedCategoryId);

      if (requestedCategory?.questionId && requestedCategory.sessionId === request.sessionId) {
        return { questionId: requestedCategory.questionId };
      }
    }

    const session = await ctx.db.get(request.sessionId);

    if (!session) {
      return;
    }

    return {
      questionId: await ensureDefaultQuestionForSession(ctx, session),
    };
  },
});

export const run = migrations.runner();
