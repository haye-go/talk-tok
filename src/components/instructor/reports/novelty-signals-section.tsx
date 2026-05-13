import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

export interface NoveltySignalsSectionProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
  signalCount: number;
  ready: boolean;
  hasEmbeddings: boolean;
}

export function NoveltySignalsSection({
  sessionSlug,
  selectedQuestionId,
  signalCount,
  ready,
  hasEmbeddings,
}: NoveltySignalsSectionProps) {
  const refreshSignals = useMutation(api.semantic.refreshSignalsForSession);

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--c-hairline)] py-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
          Novelty Signals
        </span>
        <span>
          <strong className="text-[var(--c-ink)]">{signalCount}</strong>{" "}
          <span className="text-[var(--c-muted)]">signals</span>
        </span>
        <span aria-hidden className="text-[var(--c-muted)]">·</span>
        <span
          className={ready ? "text-[var(--c-success)]" : "text-[var(--c-muted)]"}
        >
          {ready ? "ready" : "not ready"}
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => void refreshSignals({ sessionSlug, questionId: selectedQuestionId })}
        disabled={!hasEmbeddings}
      >
        Refresh Signals
      </Button>
    </section>
  );
}
