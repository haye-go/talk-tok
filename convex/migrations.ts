import { migrations } from "./components";

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

export const backfillDefaultSessionQuestions = migrations.define({
  table: "sessions",
  batchSize: 25,
  migrateOne: async (ctx, session) => {
    const now = Date.now();

    if (session.currentQuestionId) {
      const existing = await ctx.db.get(session.currentQuestionId);

      if (existing && existing.sessionId === session._id) {
        return;
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
      return;
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
      return;
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
  },
});

export const run = migrations.runner();
