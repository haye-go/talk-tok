import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";

export interface RoomSimilarityClustersProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
}

export function RoomSimilarityClusters({
  sessionSlug,
  selectedQuestionId,
}: RoomSimilarityClustersProps) {
  const questionScopedArgs = selectedQuestionId
    ? { sessionSlug, questionId: selectedQuestionId }
    : { sessionSlug };
  const semanticStatus = useQuery(api.semantic.getSemanticStatus, questionScopedArgs);
  const similarityMap = useQuery(api.semantic.getSimilarityMap, questionScopedArgs);
  const queueEmbeddings = useMutation(api.semantic.queueEmbeddingsForSession);
  const [embeddingBusy, setEmbeddingBusy] = useState(false);

  async function handleQueueEmbeddings() {
    setEmbeddingBusy(true);
    try {
      await queueEmbeddings({ sessionSlug, questionId: selectedQuestionId });
    } finally {
      setEmbeddingBusy(false);
    }
  }

  const embeddingCount = semanticStatus?.embeddingCount ?? 0;
  const noveltyCount = semanticStatus?.noveltyCount ?? 0;
  const hasEmbeddings = embeddingCount > 0;

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-medium text-[var(--c-ink)]">Similarity map</h2>
          <p className="text-xs text-[var(--c-muted)]">
            Machine-generated idea proximity. Categories remain separate.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void handleQueueEmbeddings()}
          disabled={embeddingBusy}
        >
          {embeddingBusy ? "Queued" : "Rebuild similarity map"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MetricTile label="Embeddings" value={String(embeddingCount)} />
        <MetricTile label="Signals" value={String(noveltyCount)} />
        <MetricTile label="Clusters" value={String(similarityMap?.clusters.length ?? 0)} />
        <MetricTile
          label="Status"
          value={
            similarityMap === undefined
              ? "loading"
              : similarityMap?.clusters.length
                ? "ready"
                : hasEmbeddings
                  ? "unclustered"
                  : "pending"
          }
        />
      </div>

      {similarityMap === undefined ? (
        <Card>
          <p className="text-sm text-[var(--c-muted)]">Loading similarity clusters...</p>
        </Card>
      ) : null}

      {similarityMap && similarityMap.clusters.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--c-muted)]">
            No semantic clusters yet. New submissions are embedded asynchronously; existing messages
            can be processed with Rebuild similarity map.
          </p>
        </Card>
      ) : null}

      {similarityMap?.clusters.map((cluster, index) => (
        <section
          key={cluster.id}
          className="grid gap-3 border-l-4 pl-4"
          style={{
            borderColor: `var(--c-sig-${["sky", "peach", "mustard", "coral"][index % 4]})`,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-medium text-[var(--c-ink)]">
                {cluster.label}
              </h3>
              <p className="text-xs text-[var(--c-muted)]">
                {cluster.rootSubmissionCount} roots / {cluster.messageCount} messages
              </p>
            </div>
            <Badge tone={cluster.clusterKind === "promoted" ? "success" : "neutral"}>
              {cluster.clusterKind}
            </Badge>
          </div>

          {cluster.threads.map((thread) => (
            <div
              key={thread.root.id}
              className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-display text-sm font-medium text-[var(--c-ink)]">
                  {thread.root.nickname}
                </p>
                <Badge tone="neutral">{thread.membership.score.toFixed(2)}</Badge>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--c-body)]">
                {thread.root.body}
              </p>
              {thread.replies.length > 0 ? (
                <details className="mt-3 border-t border-[var(--c-hairline)] pt-3">
                  <summary className="cursor-pointer text-xs font-medium text-[var(--c-ink)]">
                    {thread.replies.length} replies
                  </summary>
                  <div className="mt-3 grid gap-2">
                    {thread.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="border-l-2 border-[var(--c-hairline)] pl-3 text-sm"
                      >
                        <p className="font-medium text-[var(--c-ink)]">{reply.nickname}</p>
                        <p className="mt-1 whitespace-pre-wrap leading-6 text-[var(--c-body)]">
                          {reply.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          ))}
        </section>
      ))}
    </section>
  );
}
