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

async function questionIdFromSubmission(
  ctx: GenericMutationCtx<DataModel>,
  submissionId: Id<"submissions">,
  sessionId: Id<"sessions">,
) {
  const submission = await ctx.db.get(submissionId);

  return submission?.sessionId === sessionId ? submission.questionId : undefined;
}

async function questionIdFromCategory(
  ctx: GenericMutationCtx<DataModel>,
  categoryId: Id<"categories">,
  sessionId: Id<"sessions">,
) {
  const category = await ctx.db.get(categoryId);

  return category?.sessionId === sessionId ? category.questionId : undefined;
}

async function questionIdFromSynthesisArtifact(
  ctx: GenericMutationCtx<DataModel>,
  artifactId: Id<"synthesisArtifacts">,
  sessionId: Id<"sessions">,
) {
  const artifact = await ctx.db.get(artifactId);

  if (!artifact || artifact.sessionId !== sessionId) {
    return undefined;
  }

  if (artifact.questionId) {
    return artifact.questionId;
  }

  if (artifact.categoryId) {
    return await questionIdFromCategory(ctx, artifact.categoryId, sessionId);
  }

  return undefined;
}

async function questionIdFromFollowUpPrompt(
  ctx: GenericMutationCtx<DataModel>,
  promptId: Id<"followUpPrompts">,
  sessionId: Id<"sessions">,
) {
  const prompt = await ctx.db.get(promptId);

  return prompt?.sessionId === sessionId ? prompt.questionId : undefined;
}

async function questionIdFromSemanticEntity(
  ctx: GenericMutationCtx<DataModel>,
  sessionId: Id<"sessions">,
  entityType: Doc<"semanticEmbeddings">["entityType"],
  entityId: string,
) {
  if (entityType === "submission") {
    return await questionIdFromSubmission(ctx, entityId as Id<"submissions">, sessionId);
  }

  if (entityType === "category") {
    return await questionIdFromCategory(ctx, entityId as Id<"categories">, sessionId);
  }

  if (entityType === "synthesisArtifact") {
    return await questionIdFromSynthesisArtifact(
      ctx,
      entityId as Id<"synthesisArtifacts">,
      sessionId,
    );
  }

  if (entityType === "followUpPrompt") {
    return await questionIdFromFollowUpPrompt(ctx, entityId as Id<"followUpPrompts">, sessionId);
  }

  return undefined;
}

async function questionIdFromArgumentEntity(
  ctx: GenericMutationCtx<DataModel>,
  sessionId: Id<"sessions">,
  entityType: Doc<"argumentLinks">["sourceEntityType"],
  entityId: string,
) {
  if (entityType === "submission") {
    return await questionIdFromSubmission(ctx, entityId as Id<"submissions">, sessionId);
  }

  if (entityType === "category") {
    return await questionIdFromCategory(ctx, entityId as Id<"categories">, sessionId);
  }

  if (entityType === "synthesisArtifact") {
    return await questionIdFromSynthesisArtifact(
      ctx,
      entityId as Id<"synthesisArtifacts">,
      sessionId,
    );
  }

  return undefined;
}

async function defaultQuestionIdForSessionId(
  ctx: GenericMutationCtx<DataModel>,
  sessionId: Id<"sessions">,
) {
  const session = await ctx.db.get(sessionId);

  return session ? await ensureDefaultQuestionForSession(ctx, session) : undefined;
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

export const backfillSynthesisArtifactQuestionIds = migrations.define({
  table: "synthesisArtifacts",
  batchSize: 50,
  migrateOne: async (ctx, artifact) => {
    if (artifact.questionId) {
      return;
    }

    if (artifact.categoryId) {
      const categoryQuestionId = await questionIdFromCategory(
        ctx,
        artifact.categoryId,
        artifact.sessionId,
      );

      if (categoryQuestionId) {
        return { questionId: categoryQuestionId };
      }
    }

    const questionId = await defaultQuestionIdForSessionId(ctx, artifact.sessionId);

    return questionId ? { questionId } : undefined;
  },
});

export const backfillSynthesisQuoteQuestionIds = migrations.define({
  table: "synthesisQuotes",
  batchSize: 50,
  migrateOne: async (ctx, quote) => {
    if (quote.questionId) {
      return;
    }

    const artifactQuestionId = await questionIdFromSynthesisArtifact(
      ctx,
      quote.artifactId,
      quote.sessionId,
    );

    if (artifactQuestionId) {
      return { questionId: artifactQuestionId };
    }

    const submissionQuestionId = await questionIdFromSubmission(
      ctx,
      quote.submissionId,
      quote.sessionId,
    );

    if (submissionQuestionId) {
      return { questionId: submissionQuestionId };
    }

    const questionId = await defaultQuestionIdForSessionId(ctx, quote.sessionId);

    return questionId ? { questionId } : undefined;
  },
});

export const backfillSemanticEmbeddingJobQuestionIds = migrations.define({
  table: "semanticEmbeddingJobs",
  batchSize: 50,
  migrateOne: async (ctx, job) => {
    if (job.questionId) {
      return;
    }

    const questionId = await defaultQuestionIdForSessionId(ctx, job.sessionId);

    return questionId ? { questionId } : undefined;
  },
});

export const backfillSemanticEmbeddingQuestionIds = migrations.define({
  table: "semanticEmbeddings",
  batchSize: 50,
  migrateOne: async (ctx, embedding) => {
    if (embedding.questionId) {
      return;
    }

    const questionId = await questionIdFromSemanticEntity(
      ctx,
      embedding.sessionId,
      embedding.entityType,
      embedding.entityId,
    );

    return questionId ? { questionId } : undefined;
  },
});

export const backfillSemanticSignalQuestionIds = migrations.define({
  table: "semanticSignals",
  batchSize: 50,
  migrateOne: async (ctx, signal) => {
    if (signal.questionId) {
      return;
    }

    if (signal.submissionId) {
      const submissionQuestionId = await questionIdFromSubmission(
        ctx,
        signal.submissionId,
        signal.sessionId,
      );

      if (submissionQuestionId) {
        return { questionId: submissionQuestionId };
      }
    }

    if (signal.categoryId) {
      const categoryQuestionId = await questionIdFromCategory(
        ctx,
        signal.categoryId,
        signal.sessionId,
      );

      if (categoryQuestionId) {
        return { questionId: categoryQuestionId };
      }
    }

    if (signal.sourceEmbeddingId) {
      const embedding = await ctx.db.get(signal.sourceEmbeddingId);

      if (embedding?.questionId && embedding.sessionId === signal.sessionId) {
        return { questionId: embedding.questionId };
      }
    }

    const questionId = await defaultQuestionIdForSessionId(ctx, signal.sessionId);

    return questionId ? { questionId } : undefined;
  },
});

export const backfillArgumentLinkQuestionIds = migrations.define({
  table: "argumentLinks",
  batchSize: 50,
  migrateOne: async (ctx, link) => {
    if (link.questionId) {
      return;
    }

    const sourceQuestionId = await questionIdFromArgumentEntity(
      ctx,
      link.sessionId,
      link.sourceEntityType,
      link.sourceEntityId,
    );

    if (sourceQuestionId) {
      return { questionId: sourceQuestionId };
    }

    const targetQuestionId = await questionIdFromArgumentEntity(
      ctx,
      link.sessionId,
      link.targetEntityType,
      link.targetEntityId,
    );

    if (targetQuestionId) {
      return { questionId: targetQuestionId };
    }

    const questionId = await defaultQuestionIdForSessionId(ctx, link.sessionId);

    return questionId ? { questionId } : undefined;
  },
});

export const backfillAiJobQuestionIds = migrations.define({
  table: "aiJobs",
  batchSize: 50,
  migrateOne: async (ctx, job) => {
    if (job.questionId) {
      return;
    }

    if (job.submissionId) {
      const submissionQuestionId = await questionIdFromSubmission(
        ctx,
        job.submissionId,
        job.sessionId,
      );

      if (submissionQuestionId) {
        return { questionId: submissionQuestionId };
      }
    }

    if (
      job.type === "categorisation" ||
      job.type === "synthesis" ||
      job.type === "personal_report" ||
      job.type === "argument_map"
    ) {
      const questionId = await defaultQuestionIdForSessionId(ctx, job.sessionId);

      return questionId ? { questionId } : undefined;
    }
  },
});

export const backfillLlmCallQuestionIds = migrations.define({
  table: "llmCalls",
  batchSize: 50,
  migrateOne: async (ctx, call) => {
    if (call.questionId || !call.sessionId) {
      return;
    }

    if (
      call.feature === "feedback" ||
      call.feature === "categorisation" ||
      call.feature === "synthesis" ||
      call.feature === "personal_report" ||
      call.feature === "argument_map" ||
      call.feature === "embedding" ||
      call.feature === "question_baseline"
    ) {
      const questionId = await defaultQuestionIdForSessionId(ctx, call.sessionId);

      return questionId ? { questionId } : undefined;
    }
  },
});

export const backfillAuditEventQuestionIds = migrations.define({
  table: "auditEvents",
  batchSize: 50,
  migrateOne: async (ctx, event) => {
    if (event.questionId || !event.sessionId) {
      return;
    }

    if (
      event.action.startsWith("feedback.") ||
      event.action.startsWith("categorisation.") ||
      event.action.startsWith("synthesis.") ||
      event.action.startsWith("semantic.") ||
      event.action.startsWith("argument_map.") ||
      event.action.startsWith("personal_report.")
    ) {
      const questionId = await defaultQuestionIdForSessionId(ctx, event.sessionId);

      return questionId ? { questionId } : undefined;
    }
  },
});

export const run = migrations.runner();
