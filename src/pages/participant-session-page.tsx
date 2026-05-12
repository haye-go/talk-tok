import { useParams } from "@tanstack/react-router";
import { ParticipantWorkspacePage } from "@/pages/participant-workspace-page";

export function ParticipantSessionPage() {
  const { sessionSlug } = useParams({ from: "/session/$sessionSlug" });
  return <ParticipantWorkspacePage sessionSlug={sessionSlug} />;
}
