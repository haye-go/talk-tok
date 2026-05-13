import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <Card
      title="Embeddings"
      action={
        <Button size="sm" variant="secondary" onClick={() => void handleQueue()} disabled={busy}>
          {busy ? "Queued" : "Generate Embeddings"}
        </Button>
      }
    >
      <div className="-mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
        <span>
          <strong className="text-[var(--c-ink)]">{embeddingCount}</strong>{" "}
          <span className="text-[var(--c-muted)]">stored</span>
        </span>
        <span aria-hidden className="text-[var(--c-muted)]">·</span>
        <span>
          <strong className="text-[var(--c-ink)]">{submissionCount}</strong>{" "}
          <span className="text-[var(--c-muted)]">submissions</span>
        </span>
      </div>
    </Card>
  );
}
