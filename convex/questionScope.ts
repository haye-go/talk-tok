import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { createDefaultQuestionForSession } from "./sessionQuestions";

export async function resolveQuestionForRead(
  ctx: QueryCtx | MutationCtx,
  session: Doc<"sessions">,
  questionId?: Id<"sessionQuestions">,
) {
  if (questionId) {
    const question = await ctx.db.get(questionId);

    if (!question || question.sessionId !== session._id) {
      throw new Error("Question not found in this session.");
    }

    return question;
  }

  if (session.currentQuestionId) {
    const question = await ctx.db.get(session.currentQuestionId);

    if (question && question.sessionId === session._id) {
      return question;
    }
  }

  const currentQuestions = await ctx.db
    .query("sessionQuestions")
    .withIndex("by_sessionId_and_isCurrent", (q) =>
      q.eq("sessionId", session._id).eq("isCurrent", true),
    )
    .take(1);

  return currentQuestions[0] ?? null;
}

export async function resolveQuestionIdForWrite(
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
