type FightMode = "vs_ai" | "real_1v1";

interface DebriefSourceThread<SubmissionId extends string> {
  mode: FightMode;
  attackerSubmissionId?: SubmissionId;
  defenderSubmissionId?: SubmissionId;
}

interface DebriefSourceSubmission {
  body: string;
  kind: string;
}

export function sourceSubmissionIdForDebrief<SubmissionId extends string>(
  thread: DebriefSourceThread<SubmissionId>,
) {
  return thread.mode === "vs_ai" ? thread.attackerSubmissionId : thread.defenderSubmissionId;
}

export function sourcePostJsonForDebrief(submission: DebriefSourceSubmission | null) {
  return JSON.stringify(
    submission
      ? {
          role: "defended_position",
          body: submission.body,
          kind: submission.kind,
        }
      : null,
  );
}
