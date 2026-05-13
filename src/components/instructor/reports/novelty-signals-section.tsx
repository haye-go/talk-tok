import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <Card
      title="Novelty Signals"
      action={
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void refreshSignals({ sessionSlug, questionId: selectedQuestionId })}
          disabled={!hasEmbeddings}
        >
          Refresh Signals
        </Button>
      }
    >
      <div className="-mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
        <span>
          <strong className="text-[var(--c-ink)]">{signalCount}</strong>{" "}
          <span className="text-[var(--c-muted)]">signals</span>
        </span>
        <span aria-hidden className="text-[var(--c-muted)]">·</span>
        <span className={ready ? "text-[var(--c-success)]" : "text-[var(--c-muted)]"}>
          {ready ? "ready" : "not ready"}
        </span>
      </div>
    </Card>
  );
}
