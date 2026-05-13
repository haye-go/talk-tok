import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  ArgumentMapGraph,
  type ArgumentMapGraphEdge,
  type ArgumentMapGraphNode,
} from "@/components/instructor/argument-map-graph";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";

export interface ArgumentMapSectionProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
  linkCount: number;
  ready: boolean;
  errorMessage?: string;
  graph: {
    nodes: ArgumentMapGraphNode[];
    edges: ArgumentMapGraphEdge[];
    layout?: { suggestedRenderer?: string };
  } | null;
}

export function ArgumentMapSection({
  sessionSlug,
  selectedQuestionId,
  linkCount,
  ready,
  errorMessage,
  graph,
}: ArgumentMapSectionProps) {
  const generateArgumentMap = useMutation(api.argumentMap.generateForSession);
  const [busy, setBusy] = useState(false);

  async function handleGenerate() {
    setBusy(true);
    try {
      await generateArgumentMap({ sessionSlug, questionId: selectedQuestionId });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Argument Map">
      <p className="mb-3 text-xs leading-5 text-[var(--c-muted)]">
        Post-processed reasoning/relationship artifact across responses, categories, and synthesis.
        Distinct from live Similarity clusters in Room.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="grid grid-cols-2 gap-2">
          <MetricTile label="Links" value={String(linkCount)} />
          <MetricTile label="Ready" value={ready ? "Yes" : "No"} />
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void handleGenerate()}
          disabled={busy}
        >
          {busy ? "Queued" : graph ? "Regenerate" : "Generate Argument Map"}
        </Button>
      </div>
      {errorMessage ? (
        <p className="mb-3 text-xs text-[var(--c-error)]">{errorMessage}</p>
      ) : null}
      {graph ? (
        <ArgumentMapGraph
          nodes={graph.nodes}
          edges={graph.edges}
          rendererLabel={graph.layout?.suggestedRenderer}
        />
      ) : (
        <div className="rounded-lg border-2 border-dashed border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-10 text-center">
          <p className="text-sm font-semibold text-[var(--c-muted)]">
            Argument map not yet generated.
          </p>
          <p className="mt-1 text-xs text-[var(--c-muted)]">
            Nodes: categories, submissions, synthesis artifacts. Edges: supports, contradicts,
            extends, questions, bridges.
          </p>
        </div>
      )}
    </Card>
  );
}
