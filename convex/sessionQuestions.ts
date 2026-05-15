import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireInstructorPreviewPassword } from "./previewAuthGuard";

type QuestionStatus = "draft" | "released" | "archived";

const statusValidator = v.union(v.literal("draft"), v.literal("released"), v.literal("archived"));

const visibilityPatchValidator = v.object({
  peerResponsesVisible: v.optional(v.boolean()),
  categoryBoardVisible: v.optional(v.boolean()),
  categorySummariesVisible: v.optional(v.boolean()),
  synthesisVisible: v.optional(v.boolean()),
  personalReportsVisible: v.optional(v.boolean()),
  fightEnabled: v.optional(v.boolean()),
  repliesEnabled: v.optional(v.boolean()),
  upvotesEnabled: v.optional(v.boolean()),
});

function normalizeSessionSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeText(value: string, label: string, minLength: number, maxLength: number) {
  const text = value.trim().replace(/\s+/g, " ");

  if (text.length < minLength) {
    throw new Error(`${label} must be at least ${minLength} characters.`);
  }

  if (text.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }

  return text;
}

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

async function getSessionBySlug(ctx: QueryCtx | MutationCtx, sessionSlug: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_slug", (q) => q.eq("slug", normalizeSessionSlug(sessionSlug)))
    .unique();
}

async function createUniqueQuestionSlug(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"sessions">,
  title: string,
) {
  const baseSlug = slugify(title, "question");

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const existing = await ctx.db
      .query("sessionQuestions")
      .withIndex("by_sessionId_and_slug", (q) => q.eq("sessionId", sessionId).eq("slug", candidate))
      .unique();

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Could not create a unique question slug.");
}

function defaultVisibilityForSession(session: Doc<"sessions">) {
  return {
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
  };
}

export function toPublicQuestion(question: Doc<"sessionQuestions">) {
  return {
    id: question._id,
    sessionId: question.sessionId,
    slug: question.slug,
    title: question.title,
    prompt: question.prompt,
    status: question.status,
    isCurrent: question.isCurrent,
    contributionsOpen: question.contributionsOpen,
    peerResponsesVisible: question.peerResponsesVisible,
    categoryBoardVisible: question.categoryBoardVisible,
    categorySummariesVisible: question.categorySummariesVisible,
    synthesisVisible: question.synthesisVisible,
    personalReportsVisible: question.personalReportsVisible,
    fightEnabled: question.fightEnabled,
    repliesEnabled: question.repliesEnabled,
    upvotesEnabled: question.upvotesEnabled,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
    releasedAt: question.releasedAt,
    archivedAt: question.archivedAt,
  };
}

export async function listQuestionsForSession(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"sessions">,
) {
  return await ctx.db
    .query("sessionQuestions")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
    .order("asc")
    .take(100);
}

export async function getCurrentQuestionForSession(
  ctx: QueryCtx | MutationCtx,
  session: Doc<"sessions">,
) {
  if (session.currentQuestionId) {
    const question = await ctx.db.get(session.currentQuestionId);

    if (question && question.sessionId === session._id && question.isCurrent) {
      return question;
    }
  }

  const current = await ctx.db
    .query("sessionQuestions")
    .withIndex("by_sessionId_and_isCurrent", (q) =>
      q.eq("sessionId", session._id).eq("isCurrent", true),
    )
    .take(2);

  return current[0] ?? null;
}

export async function createDefaultQuestionForSession(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  now = Date.now(),
) {
  const existingCurrent = await getCurrentQuestionForSession(ctx, session);

  if (existingCurrent) {
    if (session.currentQuestionId !== existingCurrent._id) {
      await ctx.db.patch(session._id, {
        currentQuestionId: existingCurrent._id,
        updatedAt: now,
      });
    }

    return existingCurrent._id;
  }

  const existingQuestions = await listQuestionsForSession(ctx, session._id);

  if (existingQuestions.length > 0) {
    const question =
      existingQuestions.find((row) => row.status === "released") ?? existingQuestions[0];
    if (question.status !== "released") {
      await ctx.db.patch(question._id, {
        status: "released",
        releasedAt: question.releasedAt ?? now,
        archivedAt: undefined,
        updatedAt: now,
      });
    }
    await markOnlyCurrent(ctx, session, question._id, now);

    return question._id;
  }

  const title = "Opening question";
  const questionId = await ctx.db.insert("sessionQuestions", {
    sessionId: session._id,
    slug: await createUniqueQuestionSlug(ctx, session._id, title),
    title,
    prompt: session.openingPrompt,
    status: "released",
    isCurrent: true,
    contributionsOpen: session.phase !== "closed",
    ...defaultVisibilityForSession(session),
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

async function markOnlyCurrent(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  questionId: Id<"sessionQuestions">,
  now = Date.now(),
) {
  const question = await ctx.db.get(questionId);

  if (!question || question.sessionId !== session._id) {
    throw new Error("Question not found for this session.");
  }

  if (question.status === "draft") {
    throw new Error("Release the question before setting it as current.");
  }

  if (question.status === "archived") {
    throw new Error("Archived questions cannot be current.");
  }

  const currentQuestions = await ctx.db
    .query("sessionQuestions")
    .withIndex("by_sessionId_and_isCurrent", (q) =>
      q.eq("sessionId", session._id).eq("isCurrent", true),
    )
    .take(50);

  for (const current of currentQuestions) {
    if (current._id !== questionId) {
      await ctx.db.patch(current._id, { isCurrent: false, updatedAt: now });
    }
  }

  await ctx.db.patch(questionId, { isCurrent: true, updatedAt: now });
  await ctx.db.patch(session._id, {
    currentQuestionId: questionId,
    openingPrompt: question.prompt,
    updatedAt: now,
  });
}

export const listForSession = query({
  args: {
    sessionSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const questions = await listQuestionsForSession(ctx, session._id);
    const currentQuestion = await getCurrentQuestionForSession(ctx, session);

    return {
      questions: questions.map(toPublicQuestion),
      currentQuestion: currentQuestion ? toPublicQuestion(currentQuestion) : null,
    };
  },
});

export const getCurrentForSession = query({
  args: {
    sessionSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      return null;
    }

    const currentQuestion = await getCurrentQuestionForSession(ctx, session);

    return currentQuestion ? toPublicQuestion(currentQuestion) : null;
  },
});

export const createQuestion = mutation({
  args: {
    sessionSlug: v.string(),
    title: v.string(),
    prompt: v.string(),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    const session = await getSessionBySlug(ctx, args.sessionSlug);

    if (!session) {
      throw new Error("Session not found.");
    }

    const now = Date.now();
    const title = normalizeText(args.title, "Question title", 3, 120);
    const status: QuestionStatus = args.status ?? "draft";
    const questionId = await ctx.db.insert("sessionQuestions", {
      sessionId: session._id,
      slug: await createUniqueQuestionSlug(ctx, session._id, title),
      title,
      prompt: normalizeText(args.prompt, "Question prompt", 10, 2000),
      status,
      isCurrent: false,
      contributionsOpen: status === "released" && session.phase !== "closed",
      ...defaultVisibilityForSession(session),
      createdAt: now,
      updatedAt: now,
      releasedAt: status === "released" ? now : undefined,
      archivedAt: status === "archived" ? now : undefined,
    });

    await ctx.runMutation(internal.audit.record, {
      sessionId: session._id,
      questionId,
      actorType: "instructor",
      action: "session_question.created",
      targetType: "sessionQuestion",
      targetId: questionId,
      metadataJson: { status },
    });

    return toPublicQuestion((await ctx.db.get(questionId))!);
  },
});

export const updateQuestion = mutation({
  args: {
    questionId: v.id("sessionQuestions"),
    title: v.optional(v.string()),
    prompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);

    if (!question) {
      throw new Error("Question not found.");
    }

    const patch: {
      title?: string;
      prompt?: string;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    if (args.title !== undefined) {
      patch.title = normalizeText(args.title, "Question title", 3, 120);
    }

    if (args.prompt !== undefined) {
      patch.prompt = normalizeText(args.prompt, "Question prompt", 10, 2000);
    }

    await ctx.db.patch(question._id, patch);

    const session = await ctx.db.get(question.sessionId);
    if (session?.currentQuestionId === question._id && patch.prompt) {
      await ctx.db.patch(session._id, { openingPrompt: patch.prompt, updatedAt: patch.updatedAt });
    }

    await ctx.runMutation(internal.audit.record, {
      sessionId: question.sessionId,
      questionId: question._id,
      actorType: "instructor",
      action: "session_question.updated",
      targetType: "sessionQuestion",
      targetId: question._id,
      metadataJson: {
        fields: Object.keys(patch).filter((key) => key !== "updatedAt"),
      },
    });

    return toPublicQuestion((await ctx.db.get(question._id))!);
  },
});

export const releaseQuestion = mutation({
  args: {
    questionId: v.id("sessionQuestions"),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);

    if (!question) {
      throw new Error("Question not found.");
    }

    const now = Date.now();
    const session = await ctx.db.get(question.sessionId);

    if (!session) {
      throw new Error("Session not found.");
    }

    await ctx.db.patch(question._id, {
      status: "released",
      contributionsOpen: session.phase !== "closed",
      releasedAt: question.releasedAt ?? now,
      archivedAt: undefined,
      updatedAt: now,
    });

    await ctx.runMutation(internal.audit.record, {
      sessionId: question.sessionId,
      questionId: question._id,
      actorType: "instructor",
      action: "session_question.released",
      targetType: "sessionQuestion",
      targetId: question._id,
    });

    return toPublicQuestion((await ctx.db.get(question._id))!);
  },
});

export const archiveQuestion = mutation({
  args: {
    questionId: v.id("sessionQuestions"),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);

    if (!question) {
      throw new Error("Question not found.");
    }

    if (question.isCurrent) {
      throw new Error("Choose another current question before archiving this one.");
    }

    const now = Date.now();
    await ctx.db.patch(question._id, {
      status: "archived",
      contributionsOpen: false,
      archivedAt: now,
      updatedAt: now,
    });

    await ctx.runMutation(internal.audit.record, {
      sessionId: question.sessionId,
      questionId: question._id,
      actorType: "instructor",
      action: "session_question.archived",
      targetType: "sessionQuestion",
      targetId: question._id,
    });

    return toPublicQuestion((await ctx.db.get(question._id))!);
  },
});

export const setCurrentQuestion = mutation({
  args: {
    questionId: v.id("sessionQuestions"),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);

    if (!question) {
      throw new Error("Question not found.");
    }

    const session = await ctx.db.get(question.sessionId);

    if (!session) {
      throw new Error("Session not found.");
    }

    await markOnlyCurrent(ctx, session, question._id);

    await ctx.runMutation(internal.audit.record, {
      sessionId: question.sessionId,
      questionId: question._id,
      actorType: "instructor",
      action: "session_question.current_set",
      targetType: "sessionQuestion",
      targetId: question._id,
    });

    return toPublicQuestion((await ctx.db.get(question._id))!);
  },
});

export const setContributionState = mutation({
  args: {
    previewPassword: v.string(),
    questionId: v.id("sessionQuestions"),
    contributionsOpen: v.boolean(),
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const question = await ctx.db.get(args.questionId);

    if (!question) {
      throw new Error("Question not found.");
    }

    if (question.status === "archived" && args.contributionsOpen) {
      throw new Error("Archived questions cannot accept contributions.");
    }

    if (question.status === "draft" && args.contributionsOpen) {
      throw new Error("Release the question before opening contributions.");
    }

    const session = await ctx.db.get(question.sessionId);

    if (args.contributionsOpen && session?.phase === "closed") {
      throw new Error("Closed sessions cannot accept contributions.");
    }

    const now = Date.now();
    await ctx.db.patch(question._id, {
      contributionsOpen: args.contributionsOpen,
      updatedAt: now,
    });

    await ctx.runMutation(internal.audit.record, {
      sessionId: question.sessionId,
      questionId: question._id,
      actorType: "instructor",
      action: "session_question.contribution_state_updated",
      targetType: "sessionQuestion",
      targetId: question._id,
      metadataJson: { contributionsOpen: args.contributionsOpen },
    });

    return toPublicQuestion((await ctx.db.get(question._id))!);
  },
});

export const updateVisibility = mutation({
  args: {
    previewPassword: v.string(),
    questionId: v.id("sessionQuestions"),
    visibility: visibilityPatchValidator,
  },
  handler: async (ctx, args) => {
    requireInstructorPreviewPassword(args.previewPassword);
    const question = await ctx.db.get(args.questionId);

    if (!question) {
      throw new Error("Question not found.");
    }

    const patch = {
      ...args.visibility,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(question._id, patch);
    await ctx.runMutation(internal.audit.record, {
      sessionId: question.sessionId,
      questionId: question._id,
      actorType: "instructor",
      action: "session_question.visibility_updated",
      targetType: "sessionQuestion",
      targetId: question._id,
      metadataJson: args.visibility,
    });

    return toPublicQuestion((await ctx.db.get(question._id))!);
  },
});
