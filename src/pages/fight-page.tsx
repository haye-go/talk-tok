import { ParticipantShell } from "@/components/layout/participant-shell";
import { FightThread } from "@/components/fight/fight-thread";

export function FightPage() {
  return <ParticipantShell fightMe={<FightThread />} />;
}
