import { useState } from "react";
import { ArrowCounterClockwise, CheckCircle } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { SubmissionCard } from "@/components/submission/submission-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useInstructorPreviewAuth } from "@/hooks/use-instructor-preview-auth";

interface SubmissionShape {
  id: Id<"submissions">;
  createdAt: number;
  answeredAt?: number;
  [key: string]: unknown;
}

interface ThreadStats {
  upvoteCount: number;
  replyCount: number;
}

interface ThreadAssignment {
  categoryName?: string;
}

export interface ThreadCardData {
  root: {
    submission: SubmissionShape;
    stats: ThreadStats;
    nickname?: string;
  };
  replies: ReadonlyArray<{
    submission: SubmissionShape;
  }>;
  assignment: ThreadAssignment | null;
}

export interface ThreadCardProps {
  thread: ThreadCardData;
}

export function ThreadCard({ thread }: ThreadCardProps) {
  const { previewPassword } = useInstructorPreviewAuth();
  const { root, replies, assignment } = thread;
  const submission = root.submission;
  const setAnswered = useMutation(api.submissionStatus.setAnswered);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAnswered = Boolean(submission.answeredAt);

  async function handleToggleAnswered() {
    if (!previewPassword || isSaving) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await setAnswered({
        previewPassword,
        submissionId: submission.id,
        answered: !isAnswered,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update answer status.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-[18px] border border-[#d7e0ea] bg-white">
      <SubmissionCard submission={submission as never} />
      <div className="border-t border-[#e7edf3] px-4 py-3 text-xs text-[var(--c-muted)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={assignment ? "neutral" : "warning"}>
              {assignment?.categoryName ?? "Uncategorized"}
            </Badge>
            <span>{root.stats.upvoteCount} upvotes</span>
            <span>{root.stats.replyCount} replies</span>
            <span>
              {new Date(submission.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant={isAnswered ? "ghost" : "secondary"}
            icon={
              isAnswered ? (
                <ArrowCounterClockwise size={14} aria-hidden />
              ) : (
                <CheckCircle size={14} aria-hidden />
              )
            }
            onClick={() => void handleToggleAnswered()}
            disabled={!previewPassword || isSaving}
          >
            {isSaving ? "Saving..." : isAnswered ? "Reopen" : "Mark answered"}
          </Button>
        </div>
        {error ? (
          <p className="mt-2 text-xs text-[var(--c-error)]" role="alert">
            {error}
          </p>
        ) : null}
        {replies.length > 0 ? (
          <details className="mt-3">
            <summary className="cursor-pointer font-medium text-[var(--c-ink)]">
              Show replies
            </summary>
            <div className="mt-3 grid gap-2">
              {replies.map((reply) => (
                <div key={reply.submission.id} className="ml-4 border-l-2 border-[#dbe5ee] pl-3">
                  <SubmissionCard submission={reply.submission as never} />
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
