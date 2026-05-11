import type { Doc } from "./_generated/dataModel";

export function canJoinSession(session: Doc<"sessions">) {
  return session.phase !== "closed";
}

export function canViewQuestion(_session: Doc<"sessions">, question: Doc<"sessionQuestions">) {
  return question.status === "released";
}

export function canSubmitToQuestion(session: Doc<"sessions">, question: Doc<"sessionQuestions">) {
  return canJoinSession(session) && question.status === "released" && question.contributionsOpen;
}

export function canReplyToQuestion(session: Doc<"sessions">, question: Doc<"sessionQuestions">) {
  return canSubmitToQuestion(session, question) && question.repliesEnabled;
}

export function canAnswerFollowUp(
  session: Doc<"sessions">,
  question: Doc<"sessionQuestions">,
  prompt: Doc<"followUpPrompts">,
) {
  return (
    canSubmitToQuestion(session, question) &&
    prompt.status === "active" &&
    (!prompt.questionId || prompt.questionId === question._id)
  );
}

export function canUseFightMe(session: Doc<"sessions">, question: Doc<"sessionQuestions">) {
  return (
    canJoinSession(session) &&
    session.fightMeEnabled &&
    question.status === "released" &&
    question.fightEnabled
  );
}

export function canRequestRecategorisation(
  session: Doc<"sessions">,
  question: Doc<"sessionQuestions">,
) {
  return canJoinSession(session) && question.status === "released" && question.categoryBoardVisible;
}

export function assertCanJoinSession(session: Doc<"sessions">) {
  if (!canJoinSession(session)) {
    throw new Error("This session is closed.");
  }
}

export function assertCanSubmitToQuestion(
  session: Doc<"sessions">,
  question: Doc<"sessionQuestions">,
) {
  if (!canSubmitToQuestion(session, question)) {
    throw new Error("Contributions are closed for this question.");
  }
}

export function assertCanReplyToQuestion(
  session: Doc<"sessions">,
  question: Doc<"sessionQuestions">,
) {
  if (!canReplyToQuestion(session, question)) {
    throw new Error("Replies are closed for this question.");
  }
}

export function assertCanAnswerFollowUp(
  session: Doc<"sessions">,
  question: Doc<"sessionQuestions">,
  prompt: Doc<"followUpPrompts">,
) {
  if (!canAnswerFollowUp(session, question, prompt)) {
    throw new Error("This follow-up is not open for the selected question.");
  }
}

export function assertCanUseFightMe(session: Doc<"sessions">, question: Doc<"sessionQuestions">) {
  if (!canUseFightMe(session, question)) {
    throw new Error("Fight Me is not enabled for this question.");
  }
}

export function assertCanRequestRecategorisation(
  session: Doc<"sessions">,
  question: Doc<"sessionQuestions">,
) {
  if (!canRequestRecategorisation(session, question)) {
    throw new Error("Recategorisation requests are not open for this question.");
  }
}
