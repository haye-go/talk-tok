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
import { useInstructorPreviewAuth } from "@/hooks/use-instructor-preview-auth";

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
  const { previewPassword } = useInstructorPreviewAuth();
  const generateArgumentMap = useMutation(api.argumentMap.generateForSession);
  const [busy, setBusy] = useState(false);

  async function handleGenerate() {
    setBusy(true);
    try {
      await generateArgumentMap({
        sessionSlug,
        questionId: selectedQuestionId,
        previewPassword: previewPassword ?? "",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Argument Map"
      action={
        <Button size="sm" variant="secondary" onClick={() => void handleGenerate()} disabled={busy}>
          {busy ? "Queued" : graph ? "Regenerate" : "Generate Argument Map"}
        </Button>
      }
    >
      <p className="-mt-1 mb-2 text-xs text-[var(--c-muted)]">
        Post-processed reasoning artifact across responses, categories, and synthesis. Distinct
        from live Similarity clusters in Room.
      </p>
      <p className="text-xs text-[var(--c-muted)]">
        <strong className="text-[var(--c-ink)]">{linkCount}</strong> argument link
        {linkCount === 1 ? "" : "s"} ·{" "}
        <span className={ready ? "text-[var(--c-success)]" : "text-[var(--c-muted)]"}>
          {ready ? "ready" : "not yet generated"}
        </span>
      </p>
      {errorMessage ? (
        <p className="mt-2 text-xs text-[var(--c-error)]">{errorMessage}</p>
      ) : null}
      <div className="mt-3 overflow-hidden rounded-md border border-[var(--c-hairline)] bg-[var(--c-canvas)]">
        {graph ? (
          <ArgumentMapGraph
            nodes={graph.nodes}
            edges={graph.edges}
            rendererLabel={graph.layout?.suggestedRenderer}
          />
        ) : (
          <div className="border-2 border-dashed border-[var(--c-hairline)] p-10 text-center">
            <p className="text-sm font-semibold text-[var(--c-muted)]">
              Argument map not yet generated.
            </p>
            <p className="mt-1 text-xs text-[var(--c-muted)]">
              Nodes: categories, submissions, synthesis artifacts. Edges: supports, contradicts,
              extends, questions, bridges.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
