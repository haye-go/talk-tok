import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ParticipantShell } from "@/components/layout/participant-shell";
import { FightThread } from "@/components/fight/fight-thread";
import { getOrCreateClientKey, isDemoClientKey } from "@/lib/client-identity";

export function FightPage() {
  const { sessionSlug, fightSlug } = useParams({
    from: "/session/$sessionSlug/fight/$fightSlug",
  });
  const [clientKey] = useState<string>(() => getOrCreateClientKey());
  const participant = useQuery(
    api.participants.restore,
    clientKey ? { sessionSlug, clientKey } : "skip",
  );

  return (
    <ParticipantShell
      currentActId="challenge"
      defaultTab="fight-me"
      unlockAllTabs={isDemoClientKey()}
      fightMe={
        <FightThread
          sessionSlug={sessionSlug}
          fightSlug={fightSlug}
          clientKey={clientKey}
          myParticipantId={participant?.id}
        />
      }
    />
  );
}
