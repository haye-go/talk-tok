import type { ReactNode } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { ParticipantThreadCard } from "@/components/messages/participant-thread-card";
import { Button } from "@/components/ui/button";
import { categoryColorToTone } from "@/lib/category-colors";

interface ContributionSubmission {
  id: Id<"submissions">;
  body: string;
  kind: "initial" | "additional_point" | "reply" | "fight_me_turn";
  createdAt: number;
}

interface FollowUpResponse {
  id: Id<"submissions">;
  body: string;
  createdAt: number;
  followUpTitle?: string;
}

interface AssignmentData {
  categoryName?: string | null;
  categorySlug?: string | null;
  categoryId: Id<"categories">;
}

export interface ContributionThreadCardProps {
  submission: ContributionSubmission;
  assignment?: AssignmentData | null;
  followUps?: FollowUpResponse[];
  isLatest?: boolean;
  onAddFollowUp?: () => void;
  children?: ReactNode;
}

export function ContributionThreadCard({
  submission,
  assignment,
  followUps,
  isLatest = false,
  onAddFollowUp,
  children,
}: ContributionThreadCardProps) {
  const actionSlot = onAddFollowUp ? (
    <Button type="button" size="sm" variant="ghost" onClick={onAddFollowUp}>
      Add follow-up
    </Button>
  ) : null;
  const replyItems = (followUps ?? []).map((followUp) => ({
    id: followUp.id,
    authorLabel: "You",
    body: followUp.body,
    createdAt: followUp.createdAt,
    isOwn: true,
  }));

  return (
    <ParticipantThreadCard
      authorLabel=""
      body={submission.body}
      categoryName={assignment?.categoryName ?? undefined}
      categoryTone={categoryColorToTone(undefined, 0)}
      replies={replyItems}
      actions={actionSlot}
      ownership="own"
      className={isLatest ? "ring-1 ring-[var(--c-sig-sky)]/25" : undefined}
    >
      {children}
    </ParticipantThreadCard>
  );
}
