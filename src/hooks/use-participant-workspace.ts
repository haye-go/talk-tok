import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useParticipantWorkspace(sessionSlug: string, clientKey: string | null) {
  return useQuery(
    api.participantWorkspace.overview,
    clientKey ? { sessionSlug, clientKey } : "skip",
  );
}

export type ParticipantWorkspace = NonNullable<ReturnType<typeof useParticipantWorkspace>>;
