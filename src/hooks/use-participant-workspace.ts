import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useParticipantWorkspace(
  sessionSlug: string,
  clientKey: string | null,
  questionId?: Id<"sessionQuestions"> | null,
) {
  return useQuery(
    api.participantWorkspace.overview,
    clientKey ? { sessionSlug, clientKey, questionId: questionId ?? undefined } : "skip",
  );
}

export type ParticipantWorkspace = NonNullable<ReturnType<typeof useParticipantWorkspace>>;
