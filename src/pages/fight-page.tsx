import { useParams } from "@tanstack/react-router";
import { ParticipantWorkspacePage } from "@/pages/participant-workspace-page";

export function FightPage() {
  const { sessionSlug, fightSlug } = useParams({
    from: "/session/$sessionSlug/fight/$fightSlug",
  });

  return <ParticipantWorkspacePage sessionSlug={sessionSlug} initialTab="fight" fightSlug={fightSlug} />;
}
