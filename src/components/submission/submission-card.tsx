import { PretextDisplay } from "@/components/text/pretext-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { inputPatternLabel, type InputPattern } from "@/lib/submission-telemetry";
import type { Id } from "../../../convex/_generated/dataModel";

export interface SubmissionCardData {
  id: Id<"submissions">;
  nickname: string;
  body: string;
  kind: "initial" | "additional_point" | "reply" | "fight_me_turn";
  wordCount: number;
  inputPattern: InputPattern;
  pasteEventCount: number;
  keystrokeCount: number;
  compositionMs?: number;
  createdAt: number;
}

export interface SubmissionCardProps {
  submission: SubmissionCardData;
  showAuthor?: boolean;
  onAddFollowUp?: (submissionId: Id<"submissions">) => void;
}

function formatDuration(ms?: number) {
  if (typeof ms !== "number") {
    return "unknown duration";
  }

  if (ms < 60_000) {
    return `${Math.max(1, Math.round(ms / 1000))}s`;
  }

  return `${Math.round(ms / 60_000)}m`;
}

export function SubmissionCard({
  submission,
  showAuthor = true,
  onAddFollowUp,
}: SubmissionCardProps) {
  return (
    <Card
      title={showAuthor ? submission.nickname : undefined}
      eyebrow={submission.kind.replaceAll("_", " ")}
      action={
        onAddFollowUp ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onAddFollowUp(submission.id)}
          >
            Add follow-up
          </Button>
        ) : null
      }
    >
      <PretextDisplay text={submission.body} />
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--c-muted)]">
        <Badge tone={submission.inputPattern === "likely_pasted" ? "warning" : "neutral"}>
          {inputPatternLabel(submission.inputPattern)}
        </Badge>
        <span>{submission.wordCount} words</span>
        <span>{formatDuration(submission.compositionMs)}</span>
        <span>{submission.pasteEventCount} paste events</span>
      </div>
    </Card>
  );
}
