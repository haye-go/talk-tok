import { useState, type ButtonHTMLAttributes } from "react";
import {
  ArrowCounterClockwise,
  CaretDown,
  CheckCircle,
  ThumbsUp,
  Trash,
  X,
} from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { PretextDisplay } from "@/components/text/pretext-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useInstructorPreviewAuth } from "@/hooks/use-instructor-preview-auth";
import { inputPatternLabel, type InputPattern } from "@/lib/submission-telemetry";
import { cn } from "@/lib/utils";

interface SubmissionShape {
  id: Id<"submissions">;
  nickname: string;
  body: string;
  kind: "initial" | "additional_point" | "reply" | "fight_me_turn";
  wordCount: number;
  inputPattern: InputPattern;
  pasteEventCount: number;
  compositionMs?: number;
  createdAt: number;
  answeredAt?: number;
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

interface DeleteTarget {
  submission: SubmissionShape;
  replyCount: number;
}

function formatDuration(ms?: number) {
  if (typeof ms !== "number") {
    return "unknown";
  }

  if (ms < 60_000) {
    return `${Math.max(1, Math.round(ms / 1000))}s`;
  }

  return `${Math.round(ms / 60_000)}m`;
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function TelemetryPill({ submission }: { submission: SubmissionShape }) {
  const items = [
    inputPatternLabel(submission.inputPattern),
    pluralize(submission.wordCount, "word"),
    formatDuration(submission.compositionMs),
    pluralize(submission.pasteEventCount, "paste event"),
  ];

  return (
    <span className="text-[10px] text-[var(--c-muted)]">
      [{items.map((item) => item.toLowerCase()).join(" · ")}]
    </span>
  );
}

function UpvoteStat({ count }: { count: number }) {
  if (count <= 0) {
    return <span>{pluralize(count, "upvote")}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1 font-semibold text-[var(--c-tab-explore)]">
      <ThumbsUp size={12} aria-hidden />
      {pluralize(count, "upvote")}
    </span>
  );
}

function ThreadAction({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-pill px-2 text-[11px] font-medium text-[var(--c-muted)] transition-colors hover:bg-[var(--c-surface-strong)] hover:text-[var(--c-ink)] disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    />
  );
}

export function ThreadCard({ thread }: ThreadCardProps) {
  const { previewPassword } = useInstructorPreviewAuth();
  const { root, replies } = thread;
  const submission = root.submission;
  const setAnswered = useMutation(api.submissionStatus.setAnswered);
  const deleteSubmission = useMutation(api.submissionStatus.deleteSubmission);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReplies, setShowReplies] = useState(true);
  const isAnswered = Boolean(submission.answeredAt);
  const hasReplies = replies.length > 0;

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

  async function handleDeleteConfirmed() {
    if (!previewPassword || !deleteTarget || isDeleting) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      await deleteSubmission({
        previewPassword,
        submissionId: deleteTarget.submission.id,
      });
      setDeleteTarget(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete post.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <article className="rounded-lg border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3 shadow-[0_10px_28px_color-mix(in_oklch,var(--c-ink),transparent_94%)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-xs font-semibold text-[var(--c-ink)]">
              {submission.nickname}
            </p>
          </div>
          <div className="ml-auto flex shrink-0 flex-wrap justify-end gap-1">
            {isAnswered ? (
              <Badge tone="success" className="min-h-5 px-2 text-[10px]">
                Answered
              </Badge>
            ) : null}
            <ThreadAction
              onClick={() => void handleToggleAnswered()}
              disabled={!previewPassword || isSaving || isDeleting}
              className={
                isAnswered
                  ? undefined
                  : "font-semibold text-[var(--c-success)] hover:bg-[color-mix(in_oklch,var(--c-success),transparent_90%)] hover:text-[var(--c-success)]"
              }
            >
              {isAnswered ? (
                <ArrowCounterClockwise size={12} aria-hidden />
              ) : (
                <CheckCircle size={12} aria-hidden />
              )}
              {isSaving ? "Saving..." : isAnswered ? "Reopen" : "Mark answered"}
            </ThreadAction>
            <ThreadAction
              onClick={() => setDeleteTarget({ submission, replyCount: replies.length })}
              disabled={!previewPassword || isSaving || isDeleting}
              className="font-semibold text-[var(--c-error)] hover:bg-[color-mix(in_oklch,var(--c-error),transparent_90%)] hover:text-[var(--c-error)]"
            >
              <Trash size={12} aria-hidden />
              Delete
            </ThreadAction>
          </div>
        </div>

        <PretextDisplay className="mt-2 text-xs leading-relaxed" text={submission.body} />

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--c-muted)]">
            <UpvoteStat count={root.stats.upvoteCount} />
            <span>{pluralize(root.stats.replyCount, "reply", "replies")}</span>
            <span>{formatTime(submission.createdAt)}</span>
            <TelemetryPill submission={submission} />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {hasReplies ? (
              <ThreadAction onClick={() => setShowReplies((value) => !value)}>
                <CaretDown
                  size={12}
                  className={cn("transition-transform", showReplies && "rotate-180")}
                />
                {showReplies ? "Hide replies" : "Show replies"}
              </ThreadAction>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="mt-2 text-xs text-[var(--c-error)]" role="alert">
            {error}
          </p>
        ) : null}

        {hasReplies && showReplies ? (
          <div className="mt-2 flex flex-col gap-2">
            {replies.map((reply) => (
              <div
                key={reply.submission.id}
                className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-canvas)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-semibold text-[var(--c-ink)]">
                    {reply.submission.nickname}
                  </p>
                  <ThreadAction
                    onClick={() => setDeleteTarget({ submission: reply.submission, replyCount: 0 })}
                    disabled={!previewPassword || isDeleting}
                    className="min-h-6 px-1.5 text-[var(--c-error)] hover:bg-[color-mix(in_oklch,var(--c-error),transparent_90%)] hover:text-[var(--c-error)]"
                    aria-label={`Delete reply by ${reply.submission.nickname}`}
                  >
                    <Trash size={12} aria-hidden />
                    Delete
                  </ThreadAction>
                </div>
                <PretextDisplay
                  className="mt-1 text-xs leading-relaxed"
                  text={reply.submission.body}
                />
              </div>
            ))}
          </div>
        ) : null}
      </article>

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-post-title-${deleteTarget.submission.id}`}
            className="w-full max-w-md rounded-lg border border-[var(--c-hairline)] bg-[#f7f4ee] p-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id={`delete-post-title-${deleteTarget.submission.id}`}
                  className="font-display text-base font-semibold text-[var(--c-ink)]"
                >
                  Delete post?
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[var(--c-muted)]">
                  This removes the post from participant and instructor views
                  {deleteTarget.replyCount > 0
                    ? `, including ${pluralize(deleteTarget.replyCount, "reply", "replies")}`
                    : ""}
                  .
                </p>
              </div>
              <button
                type="button"
                className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full text-[var(--c-muted)] hover:bg-[var(--c-surface-strong)] hover:text-[var(--c-ink)]"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                aria-label="Cancel delete"
              >
                <X size={14} aria-hidden />
              </button>
            </div>

            <div className="mt-3 rounded-md border border-[var(--c-hairline)] bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
                {deleteTarget.submission.nickname}
              </p>
              <PretextDisplay
                className="mt-1 max-h-32 overflow-y-auto text-xs leading-relaxed"
                text={deleteTarget.submission.body}
              />
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void handleDeleteConfirmed()}
                disabled={isDeleting || !previewPassword}
              >
                {isDeleting ? "Deleting..." : "Delete post"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
