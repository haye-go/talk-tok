import { useParams } from "@tanstack/react-router";
import { ParticipantWorkspacePage } from "@/pages/participant-workspace-page";

export function ReviewPage() {
  const { sessionSlug } = useParams({ from: "/session/$sessionSlug/review" });
  return <ParticipantWorkspacePage sessionSlug={sessionSlug} initialTab="me" showReviewDetail />;
}
