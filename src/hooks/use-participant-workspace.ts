import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { TabId } from "@/lib/constants";

export function useParticipantWorkspace(
  sessionSlug: string,
  clientKey: string | null,
  questionId?: Id<"sessionQuestions"> | null,
  activeTab?: TabId,
) {
  return useQuery(
    api.participantWorkspace.overview,
    clientKey ? { sessionSlug, clientKey, questionId: questionId ?? undefined, activeTab } : "skip",
  );
}

export type ParticipantWorkspace = NonNullable<ReturnType<typeof useParticipantWorkspace>>;
