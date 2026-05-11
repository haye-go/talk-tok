import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const REACTION_KINDS = [
  { kind: "agree", icon: "👍", label: "Agree" },
  { kind: "sharp", icon: "⚡", label: "Sharp" },
  { kind: "question", icon: "❓", label: "Question" },
  { kind: "spark", icon: "✨", label: "Spark" },
  { kind: "changed_mind", icon: "🔄", label: "Changed my mind" },
] as const;

type ReactionKind = (typeof REACTION_KINDS)[number]["kind"];

interface ReactionBarProps {
  submissionId: Id<"submissions">;
  sessionSlug: string;
  clientKey: string;
  counts?: Record<string, number>;
  myReactions?: string[];
}

export function ReactionBar({
  submissionId,
  sessionSlug,
  clientKey,
  counts,
  myReactions,
}: ReactionBarProps) {
  const toggle = useMutation(api.reactions.toggle);

  function handleToggle(kind: ReactionKind) {
    void toggle({ sessionSlug, clientKey, submissionId, kind });
  }

  return (
    <div className="flex flex-wrap gap-1">
      {REACTION_KINDS.map(({ kind, icon, label }) => {
        const count = counts?.[kind] ?? 0;
        const active = myReactions?.includes(kind) ?? false;
        return (
          <button
            key={kind}
            type="button"
            title={label}
            onClick={() => handleToggle(kind)}
            className={cn(
              "inline-flex items-center gap-0.5 rounded-pill px-1.5 py-0.5 text-[10px] transition-colors",
              active
                ? "bg-[var(--c-primary)] text-[var(--c-on-primary)]"
                : "bg-[var(--c-surface-strong)] text-[var(--c-muted)] hover:bg-[var(--c-border-strong)]",
            )}
          >
            <span>{icon}</span>
            {count > 0 && <span className="font-mono">{count}</span>}
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
  const entries = REACTION_KINDS.filter(({ kind }) => (counts[kind] ?? 0) > 0);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(({ kind, icon }) => (
        <span
          key={kind}
          className="inline-flex items-center gap-0.5 rounded-pill bg-[var(--c-surface-strong)] px-1.5 py-0.5 text-[10px] text-[var(--c-muted)]"
        >
          <span>{icon}</span>
          <span className="font-mono">{counts[kind]}</span>
        </span>
      ))}
    </div>
  );
}
