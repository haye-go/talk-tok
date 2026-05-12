import { CaretDown, ChatCircleText, Clock, ThumbsUp } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ParticipantThreadReply {
  id: string;
  authorLabel: string;
  body: string;
  createdAt?: number;
  isOwn?: boolean;
}

export interface ParticipantThreadStats {
  upvoteCount?: number;
  replyCount?: number;
}

interface ParticipantThreadCardProps {
  authorLabel: string;
  body: string;
  createdAt?: number;
  categoryName?: string;
  categoryTone?: NonNullable<BadgeProps["tone"]>;
  stats?: ParticipantThreadStats;
  replies?: ParticipantThreadReply[];
  actions?: ReactNode;
  children?: ReactNode;
  ownership?: "own" | "peer";
  className?: string;
}

function formatTime(timestamp?: number) {
  if (!timestamp) return null;

  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ParticipantThreadAction({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-pill px-2 text-[11px] font-medium text-[var(--c-muted)] transition-colors hover:bg-[var(--c-surface-strong)] hover:text-[var(--c-ink)] disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ParticipantThreadReplies({ replies }: { replies: ParticipantThreadReply[] }) {
  const [expanded, setExpanded] = useState(false);

  if (replies.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-[var(--c-hairline)] pt-2">
      <button
        type="button"
        className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-pill px-2 text-[11px] font-medium text-[var(--c-muted)] hover:bg-[var(--c-surface-strong)] hover:text-[var(--c-ink)]"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <CaretDown size={12} className={cn("transition-transform", expanded && "rotate-180")} />
        {expanded
          ? "Hide replies"
          : `Show ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
      </button>

      {expanded ? (
        <div className="mt-2 flex flex-col gap-2">
          {replies.map((reply) => (
            <div
              key={reply.id}
              className={cn(
                "rounded-md border border-[var(--c-hairline)] bg-[var(--c-canvas)] p-3",
                reply.isOwn && "border-l-[3px] border-l-[var(--c-sig-sky)]",
              )}
            >
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--c-muted)]">
                <span className="font-medium text-[var(--c-ink)]">
                  {reply.isOwn ? "You" : reply.authorLabel}
                </span>
                {formatTime(reply.createdAt) ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={10} />
                    {formatTime(reply.createdAt)}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--c-body)]">{reply.body}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ParticipantThreadCard({
  authorLabel,
  body,
  createdAt,
  categoryName,
  categoryTone = "neutral",
  stats,
  replies = [],
  actions,
  children,
  ownership = "peer",
  className,
}: ParticipantThreadCardProps) {
  const timestamp = formatTime(createdAt);
  const replyCount = stats?.replyCount ?? replies.length;
  const upvoteCount = stats?.upvoteCount ?? 0;

  return (
    <article
      className={cn(
        "rounded-lg border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3 shadow-[0_10px_28px_color-mix(in_oklch,var(--c-ink),transparent_94%)]",
        ownership === "own" && "border-l-[3px] border-l-[var(--c-sig-sky)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-medium text-[var(--c-ink)]">
            {ownership === "own" ? "You" : authorLabel}
          </p>
          {timestamp ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-[var(--c-muted)]">
              <Clock size={10} />
              {timestamp}
            </p>
          ) : null}
        </div>
        {categoryName ? (
          <Badge tone={categoryTone} className="min-h-5 shrink-0 px-2 text-[10px]">
            {categoryName}
          </Badge>
        ) : null}
      </div>

      <p className="mt-2 text-sm leading-relaxed text-[var(--c-body)]">{body}</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--c-hairline)] pt-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--c-muted)]">
          <span className="inline-flex items-center gap-1">
            <ThumbsUp size={12} />
            <span className="font-mono">{upvoteCount}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <ChatCircleText size={12} />
            <span className="font-mono">{replyCount}</span>
          </span>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-1">{actions}</div> : null}
      </div>

      {replies.length > 0 ? (
        <div className="mt-2">
          <ParticipantThreadReplies replies={replies} />
        </div>
      ) : null}

      {children ? <div className="mt-3">{children}</div> : null}
    </article>
  );
}
