import { CaretDown } from "@phosphor-icons/react";
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

interface ParticipantThreadCardProps {
  authorLabel: string;
  body: string;
  categoryName?: string;
  categoryTone?: NonNullable<BadgeProps["tone"]>;
  replies?: ParticipantThreadReply[];
  actions?: ReactNode;
  children?: ReactNode;
  ownership?: "own" | "peer";
  className?: string;
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

function ParticipantThreadReplies({ replies }: { replies: ParticipantThreadReply[] }) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      {replies.map((reply) => (
        <div
          key={reply.id}
          className={cn(
            "rounded-md border border-[var(--c-hairline)] bg-[var(--c-canvas)] p-3",
            reply.isOwn && "border-l-[3px] border-l-[var(--c-sig-sky)]",
          )}
        >
          <p className="text-[10px] font-semibold text-[var(--c-ink)]">
            {reply.isOwn ? "You" : reply.authorLabel}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--c-body)]">{reply.body}</p>
        </div>
      ))}
    </div>
  );
}

export function ParticipantThreadCard({
  authorLabel,
  body,
  categoryName,
  categoryTone = "neutral",
  replies = [],
  actions,
  children,
  ownership = "peer",
  className,
}: ParticipantThreadCardProps) {
  const [showReplies, setShowReplies] = useState(true);
  const hasReplies = replies.length > 0;
  const hasActionBar = actions || hasReplies;

  return (
    <article
      className={cn(
        "rounded-lg border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3 shadow-[0_10px_28px_color-mix(in_oklch,var(--c-ink),transparent_94%)]",
        ownership === "own" && "border-l-[3px] border-l-[var(--c-sig-sky)]",
        className,
      )}
    >
      {(authorLabel || categoryName) ? (
        <div className="flex items-start justify-between gap-3">
          {authorLabel ? (
            <p className="min-w-0 font-display text-xs font-semibold text-[var(--c-ink)]">
              {authorLabel}
            </p>
          ) : null}
          {categoryName ? (
            <Badge tone={categoryTone} className="ml-auto min-h-5 shrink-0 px-2 text-[10px]">
              {categoryName}
            </Badge>
          ) : null}
        </div>
      ) : null}

      <p className={cn("text-xs leading-relaxed text-[var(--c-body)]", (authorLabel || categoryName) && "mt-1.5")}>{body}</p>

      {hasActionBar ? (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1">
          {hasReplies ? (
            <ParticipantThreadAction onClick={() => setShowReplies((v) => !v)}>
              <CaretDown
                size={12}
                className={cn("transition-transform", showReplies && "rotate-180")}
              />
              {showReplies
                ? "Hide replies"
                : `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
            </ParticipantThreadAction>
          ) : (
            <span />
          )}
          {actions ? <div className="flex flex-wrap items-center gap-1">{actions}</div> : null}
        </div>
      ) : null}

      {hasReplies && showReplies ? <ParticipantThreadReplies replies={replies} /> : null}

      {children ? <div className="mt-3">{children}</div> : null}
    </article>
  );
}
