import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MetricTile } from "@/components/ui/metric-tile";
import { useInstructorPreviewAuth } from "@/hooks/use-instructor-preview-auth";

const DEFAULT_CLUSTER_JOIN_THRESHOLD = 0.6;
const MIN_CLUSTER_JOIN_THRESHOLD = 0.35;
const MAX_CLUSTER_JOIN_THRESHOLD = 0.95;
const THRESHOLD_PRESETS = [0.5, 0.6, 0.7, 0.8] as const;

export interface RoomSimilarityClustersProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
}

function formatThreshold(value: number) {
  return value.toFixed(2);
}

export function RoomSimilarityClusters({
  sessionSlug,
  selectedQuestionId,
}: RoomSimilarityClustersProps) {
  const { previewPassword } = useInstructorPreviewAuth();
  const questionScopedArgs = selectedQuestionId
    ? { sessionSlug, questionId: selectedQuestionId, previewPassword: previewPassword ?? "" }
    : { sessionSlug, previewPassword: previewPassword ?? "" };
  const semanticStatus = useQuery(
    api.semantic.getSemanticStatus,
    previewPassword ? questionScopedArgs : "skip",
  );
  const similarityMap = useQuery(
    api.semantic.getSimilarityMap,
    previewPassword ? questionScopedArgs : "skip",
  );
  const queueEmbeddings = useMutation(api.semantic.queueEmbeddingsForSession);
  const reclusterSimilarityMap = useAction(api.semantic.reclusterSimilarityMap);
  const [embeddingBusy, setEmbeddingBusy] = useState(false);
  const [thresholdInput, setThresholdInput] = useState(
    formatThreshold(DEFAULT_CLUSTER_JOIN_THRESHOLD),
  );

  const embeddingCount = semanticStatus?.embeddingCount ?? 0;
  const noveltyCount = semanticStatus?.noveltyCount ?? 0;
  const hasEmbeddings = embeddingCount > 0;
  const mapActionLabel = hasEmbeddings ? "Recluster map" : "Build similarity map";
  const parsedThreshold = Number(thresholdInput);
  const thresholdIsValid =
    Number.isFinite(parsedThreshold) &&
    parsedThreshold >= MIN_CLUSTER_JOIN_THRESHOLD &&
    parsedThreshold <= MAX_CLUSTER_JOIN_THRESHOLD;
  const selectedThreshold = thresholdIsValid
    ? Math.round(parsedThreshold * 100) / 100
    : DEFAULT_CLUSTER_JOIN_THRESHOLD;
  const appliedThreshold =
    similarityMap?.diagnostics?.clusterJoinThreshold ?? DEFAULT_CLUSTER_JOIN_THRESHOLD;

  async function handleRefreshSimilarityMap() {
    if (!thresholdIsValid) {
      return;
    }

    setEmbeddingBusy(true);
    try {
      if (hasEmbeddings) {
        await reclusterSimilarityMap({
          sessionSlug,
          questionId: selectedQuestionId,
          previewPassword: previewPassword ?? "",
          clusterJoinThreshold: selectedThreshold,
        });
      } else {
        await queueEmbeddings({
          sessionSlug,
          questionId: selectedQuestionId,
          previewPassword: previewPassword ?? "",
          clusterJoinThreshold: selectedThreshold,
        });
      }
    } finally {
      setEmbeddingBusy(false);
    }
  }

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
          onClick={() => void handleRefreshSimilarityMap()}
          disabled={embeddingBusy || !thresholdIsValid}
        >
          {embeddingBusy ? "Working..." : mapActionLabel}
        </Button>
      </div>

      <Card className="grid gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-44">
            <Input
              label="Next run threshold"
              type="number"
              inputMode="decimal"
              min={MIN_CLUSTER_JOIN_THRESHOLD}
              max={MAX_CLUSTER_JOIN_THRESHOLD}
              step="0.05"
              value={thresholdInput}
              onChange={(event) => setThresholdInput(event.target.value)}
              error={
                thresholdIsValid
                  ? undefined
                  : `Use ${formatThreshold(MIN_CLUSTER_JOIN_THRESHOLD)} to ${formatThreshold(MAX_CLUSTER_JOIN_THRESHOLD)}.`
              }
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {THRESHOLD_PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                size="sm"
                variant={selectedThreshold === preset ? "primary" : "secondary"}
                onClick={() => setThresholdInput(formatThreshold(preset))}
              >
                {formatThreshold(preset)}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-xs leading-5 text-[var(--c-muted)]">
          Lower values merge more ideas into shared clusters. Higher values keep clusters tighter.
          Current map was built at {formatThreshold(appliedThreshold)}.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        <MetricTile label="Embeddings" value={String(embeddingCount)} />
        <MetricTile label="Signals" value={String(noveltyCount)} />
        <MetricTile label="Clusters" value={String(similarityMap?.clusters.length ?? 0)} />
        <MetricTile
          label="Singletons"
          value={String(similarityMap?.diagnostics?.singletonClusterCount ?? 0)}
        />
        <MetricTile
          label="Avg size"
          value={(similarityMap?.diagnostics?.averageClusterSize ?? 0).toFixed(1)}
        />
        <MetricTile label="Threshold" value={formatThreshold(appliedThreshold)} />
      </div>
      <p className="text-xs text-[var(--c-muted)]">
        {hasEmbeddings
          ? "Recluster map reuses stored embeddings, so it does not call the embedding model again."
          : "Build similarity map queues embeddings for current posts, then clusters them."}
      </p>

      {similarityMap === undefined ? (
        <Card>
          <p className="text-sm text-[var(--c-muted)]">Loading similarity clusters...</p>
        </Card>
      ) : null}

      {similarityMap && similarityMap.clusters.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--c-muted)]">
            No semantic clusters yet. New submissions are embedded asynchronously; existing messages
            can be processed with Build similarity map.
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
