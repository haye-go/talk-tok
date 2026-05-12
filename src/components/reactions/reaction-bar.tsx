import {
  ArrowsClockwise,
  Lightning,
  Question,
  Sparkle,
  ThumbsUp,
} from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const REACTION_KINDS = [
  { kind: "agree", icon: ThumbsUp, label: "Upvote" },
  { kind: "sharp", icon: Lightning, label: "Sharp" },
  { kind: "question", icon: Question, label: "Question" },
  { kind: "spark", icon: Sparkle, label: "Spark" },
  { kind: "changed_mind", icon: ArrowsClockwise, label: "Changed my mind" },
] as const;

type ReactionKind = (typeof REACTION_KINDS)[number]["kind"];

interface ReactionBarProps {
  submissionId: Id<"submissions">;
  sessionSlug: string;
  clientKey: string;
  counts?: Record<string, number>;
  myReactions?: string[];
  mode?: "upvote" | "all";
  variant?: "pill" | "compact";
  disabled?: boolean;
}

function reactionEntries(mode: "upvote" | "all") {
  return mode === "upvote"
    ? REACTION_KINDS.filter((entry) => entry.kind === "agree")
    : REACTION_KINDS;
}

export function ReactionBar({
  submissionId,
  sessionSlug,
  clientKey,
  counts,
  myReactions,
  mode = "upvote",
  variant = "pill",
  disabled = false,
}: ReactionBarProps) {
  const toggle = useMutation(api.reactions.toggle);

  function handleToggle(kind: ReactionKind) {
    if (disabled) {
      return;
    }
    void toggle({ sessionSlug, clientKey, submissionId, kind });
  }

  return (
    <div className="flex flex-wrap gap-1">
      {reactionEntries(mode).map(({ kind, icon: Icon, label }) => {
        const count = counts?.[kind] ?? 0;
        const active = myReactions?.includes(kind) ?? false;
        return (
          <button
            key={kind}
            type="button"
            title={label}
            disabled={disabled}
            onClick={() => handleToggle(kind)}
            aria-label={`${active ? "Remove" : "Add"} ${label.toLowerCase()}`}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1 rounded-pill text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-45",
              variant === "compact" ? "min-h-8 px-2" : "px-2 py-1",
              active
                ? "bg-[var(--c-primary)] text-[var(--c-on-primary)]"
                : "bg-[var(--c-surface-strong)] text-[var(--c-muted)] hover:bg-[var(--c-border-strong)]",
            )}
          >
            <Icon size={12} weight={active ? "fill" : "regular"} />
            {variant === "compact" && mode === "upvote" ? null : (
              <span>{mode === "upvote" ? "Upvote" : label}</span>
            )}
            <span className="font-mono">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

interface ReactionCountsProps {
  counts?: Record<string, number>;
}

export function ReactionCounts({ counts }: ReactionCountsProps) {
  if (!counts) return null;
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  if (total === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      <span className="inline-flex items-center gap-1 rounded-pill bg-[var(--c-surface-strong)] px-1.5 py-0.5 text-[10px] text-[var(--c-muted)]">
        <ThumbsUp size={11} />
        <span className="font-mono">{counts.agree ?? 0}</span>
      </span>
    </div>
  );
}
