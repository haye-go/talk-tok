import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

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
    <section className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--c-hairline)] py-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
          Embeddings
        </span>
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
      <Button size="sm" variant="secondary" onClick={() => void handleQueue()} disabled={busy}>
        {busy ? "Queued" : "Generate Embeddings"}
      </Button>
    </section>
  );
}
