import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";

export interface EmbeddingsStatusSectionProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
  embeddingCount: number;
  submissionCount: number;
}

export function EmbeddingsStatusSection({
  sessionSlug,
  selectedQuestionId,
  embeddingCount,
  submissionCount,
}: EmbeddingsStatusSectionProps) {
  const queueEmbeddings = useMutation(api.semantic.queueEmbeddingsForSession);
  const [busy, setBusy] = useState(false);

  async function handleQueue() {
    setBusy(true);
    try {
      await queueEmbeddings({ sessionSlug, questionId: selectedQuestionId });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Embeddings">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <MetricTile label="Stored" value={String(embeddingCount)} />
        <MetricTile label="Submissions" value={String(submissionCount)} />
      </div>
      <Button size="sm" variant="secondary" onClick={() => void handleQueue()} disabled={busy}>
        {busy ? "Queued" : "Generate Embeddings"}
      </Button>
    </Card>
  );
}
