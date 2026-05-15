import { useState, type ButtonHTMLAttributes } from "react";
import { ArrowCounterClockwise, CaretDown, CheckCircle, ThumbsUp } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { PretextDisplay } from "@/components/text/pretext-display";
import { Badge } from "@/components/ui/badge";
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
  const [isSaving, setIsSaving] = useState(false);
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

  return (
    <article className="rounded-lg border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3 shadow-[0_10px_28px_color-mix(in_oklch,var(--c-ink),transparent_94%)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xs font-semibold text-[var(--c-ink)]">
            {submission.nickname}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
            {submission.kind.replaceAll("_", " ")}
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
            disabled={!previewPassword || isSaving}
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
              <p className="text-[10px] font-semibold text-[var(--c-ink)]">
                {reply.submission.nickname}
              </p>
              <PretextDisplay
                className="mt-1 text-xs leading-relaxed"
                text={reply.submission.body}
              />
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
