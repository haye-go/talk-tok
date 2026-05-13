import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";

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
    <Card title="Novelty Signals">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <MetricTile label="Signals" value={String(signalCount)} />
        <MetricTile label="Ready" value={ready ? "Yes" : "No"} />
      </div>
      <p className="mb-3 text-xs leading-5 text-[var(--c-muted)]">
        Refresh recomputes novelty from existing embeddings. It does not create missing embeddings.
      </p>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => void refreshSignals({ sessionSlug, questionId: selectedQuestionId })}
        disabled={!hasEmbeddings}
      >
        Refresh Signals
      </Button>
    </Card>
  );
}
