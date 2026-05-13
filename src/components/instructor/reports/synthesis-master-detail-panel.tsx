import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SynthesisArtifact {
  id: Id<"synthesisArtifacts">;
  categoryId?: Id<"categories">;
  kind: string;
  status: string;
  title: string;
  summary?: string | null;
  keyPoints?: string[];
  uniqueInsights?: string[];
  opposingViews?: string[];
  error?: string | null;
  generatedAt?: number | null;
  publishedAt?: number | null;
  finalizedAt?: number | null;
  updatedAt: number;
}

interface CategoryRef {
  id: Id<"categories">;
  name: string;
}

export interface SynthesisMasterDetailPanelProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
  artifacts: SynthesisArtifact[];
  categories: CategoryRef[];
  synthesisReleasedForQuestion: boolean;
  sessionPrivateVisibility: boolean;
  counts: Record<string, number>;
}

type ItemKey =
  | { type: "class" }
  | { type: "opposing" }
  | { type: "category"; categoryId: Id<"categories"> };

function statusTone(status: string) {
  switch (status) {
    case "final":
      return "success" as const;
    case "published":
      return "sky" as const;
    case "draft":
      return "warning" as const;
    case "error":
      return "error" as const;
    default:
      return "neutral" as const;
  }
}

function statusDot(status: string) {
  switch (status) {
    case "final":
    case "published":
      return "bg-[var(--c-success)]";
    case "draft":
    case "queued":
    case "processing":
      return "bg-[var(--c-warning)]";
    case "error":
      return "bg-[var(--c-error)]";
    default:
      return "bg-[var(--c-hairline)]";
  }
}

export function SynthesisMasterDetailPanel({
  sessionSlug,
  selectedQuestionId,
  artifacts,
  categories,
  synthesisReleasedForQuestion,
  sessionPrivateVisibility,
  counts,
}: SynthesisMasterDetailPanelProps) {
  const generateClassSynthesis = useMutation(api.synthesis.generateClassSynthesis);
  const generateCategorySummary = useMutation(api.synthesis.generateCategorySummary);

  const [generatingClass, setGeneratingClass] = useState(false);
  const [generatingOpposing, setGeneratingOpposing] = useState(false);
  const [generatingCategoryId, setGeneratingCategoryId] = useState<Id<"categories"> | null>(null);

  const classArtifact = useMemo(
    () =>
      artifacts.find(
        (artifact) =>
          artifact.kind === "class_synthesis" &&
          (artifact.status === "draft" ||
            artifact.status === "published" ||
            artifact.status === "final"),
      ) ?? null,
    [artifacts],
  );

  const opposingArtifact = useMemo(
    () =>
      artifacts.find(
        (artifact) =>
          artifact.kind === "opposing_views" &&
          (artifact.status === "draft" ||
            artifact.status === "published" ||
            artifact.status === "final"),
      ) ?? null,
    [artifacts],
  );

  const categorySummaries = useMemo(() => {
    const byCategory = new Map<Id<"categories">, SynthesisArtifact>();
    for (const artifact of artifacts) {
      if (artifact.kind === "category_summary" && artifact.categoryId) {
        const existing = byCategory.get(artifact.categoryId);
        if (!existing || artifact.updatedAt > existing.updatedAt) {
          byCategory.set(artifact.categoryId, artifact);
        }
      }
    }
    return byCategory;
  }, [artifacts]);

  const [selection, setSelection] = useState<ItemKey>({ type: "class" });

  function selectionKey(item: ItemKey) {
    if (item.type === "category") return `category:${item.categoryId}`;
    return item.type;
  }

  function isActive(item: ItemKey) {
    return selectionKey(item) === selectionKey(selection);
  }

  async function handleGenerateClass(kind?: "opposing_views") {
    if (!selectedQuestionId) return;
    const setBusy = kind === "opposing_views" ? setGeneratingOpposing : setGeneratingClass;
    setBusy(true);
    try {
      await generateClassSynthesis({
        sessionSlug,
        questionId: selectedQuestionId,
        ...(kind ? { kind } : {}),
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateCategory(categoryId: Id<"categories">) {
    setGeneratingCategoryId(categoryId);
    try {
      await generateCategorySummary({ sessionSlug, categoryId });
    } finally {
      setGeneratingCategoryId(null);
    }
  }

  return (
    <Card title="Synthesis">
      <p className="mb-3 text-xs leading-5 text-[var(--c-muted)]">
        Draft artifacts are instructor-only. Published and final artifacts are learner-facing only
        when synthesis is released for the current question
        {sessionPrivateVisibility ? " and session visibility is no longer private." : "."}
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone={synthesisReleasedForQuestion ? "success" : "warning"}>
          {synthesisReleasedForQuestion ? "Synthesis released" : "Synthesis hidden"}
        </Badge>
        {sessionPrivateVisibility ? (
          <Badge tone="warning">Session visibility private</Badge>
        ) : null}
        <span className="ml-auto flex flex-wrap gap-1.5 text-[10px] text-[var(--c-muted)]">
          <span>Draft {counts.draft ?? 0}</span>
          <span>· Published {counts.published ?? 0}</span>
          <span>· Final {counts.final ?? 0}</span>
          <span>· Error {counts.error ?? 0}</span>
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => void handleGenerateClass()}
          disabled={generatingClass || !selectedQuestionId}
        >
          {generatingClass ? "Generating..." : "Generate Class Synthesis"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void handleGenerateClass("opposing_views")}
          disabled={generatingOpposing || !selectedQuestionId}
        >
          {generatingOpposing ? "Generating..." : "Generate Opposing Views"}
        </Button>
      </div>

      <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-[var(--c-hairline)] md:grid-cols-[220px_minmax(0,1fr)] md:min-h-[340px]">
        {/* Master list */}
        <ul className="flex flex-col border-b border-[var(--c-hairline)] bg-[var(--c-surface-soft)] md:border-b-0 md:border-r">
          <li className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--c-muted)]">
            Artifacts
          </li>
          <SynthesisListItem
            label="Class Synthesis"
            statusLabel={classArtifact?.status ?? "Not generated"}
            statusClass={statusDot(classArtifact?.status ?? "idle")}
            active={isActive({ type: "class" })}
            onClick={() => setSelection({ type: "class" })}
          />
          <SynthesisListItem
            label="Opposing Views"
            statusLabel={opposingArtifact?.status ?? "Not generated"}
            statusClass={statusDot(opposingArtifact?.status ?? "idle")}
            active={isActive({ type: "opposing" })}
            onClick={() => setSelection({ type: "opposing" })}
          />
          {categories.length > 0 ? (
            <li className="border-t border-[var(--c-hairline)] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--c-muted)]">
              Per Category
            </li>
          ) : null}
          {categories.map((category) => {
            const summary = categorySummaries.get(category.id);
            return (
              <SynthesisListItem
                key={category.id}
                label={category.name}
                statusLabel={summary?.status ?? "Not generated"}
                statusClass={statusDot(summary?.status ?? "idle")}
                active={isActive({ type: "category", categoryId: category.id })}
                onClick={() => setSelection({ type: "category", categoryId: category.id })}
              />
            );
          })}
        </ul>

        {/* Detail pane */}
        <div className="max-h-[420px] overflow-y-auto bg-white p-4">
          {selection.type === "class" ? (
            <ArtifactDetail
              artifact={classArtifact}
              emptyLabel="No class synthesis generated yet."
              emptyHint="Use the Generate Class Synthesis button to create one."
              onRegenerate={() => void handleGenerateClass()}
              regenerating={generatingClass}
            />
          ) : null}
          {selection.type === "opposing" ? (
            <ArtifactDetail
              artifact={opposingArtifact}
              emptyLabel="No opposing views artifact yet."
              emptyHint="Requires at least 2 categories with 3+ threads each."
              onRegenerate={() => void handleGenerateClass("opposing_views")}
              regenerating={generatingOpposing}
            />
          ) : null}
          {selection.type === "category" ? (
            <CategoryArtifactDetail
              artifact={categorySummaries.get(selection.categoryId) ?? null}
              category={categories.find((c) => c.id === selection.categoryId) ?? null}
              regenerating={generatingCategoryId === selection.categoryId}
              onRegenerate={() => void handleGenerateCategory(selection.categoryId)}
            />
          ) : null}
        </div>
      </div>
    </Card>
  );
}

interface SynthesisListItemProps {
  label: string;
  statusLabel: string;
  statusClass: string;
  active: boolean;
  onClick: () => void;
}

function SynthesisListItem({
  label,
  statusLabel,
  statusClass,
  active,
  onClick,
}: SynthesisListItemProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-2 border-t border-[var(--c-hairline)] px-3 py-2 text-left text-xs transition",
          active ? "bg-white font-semibold text-[var(--c-ink)]" : "text-[var(--c-body)] hover:bg-white/70",
        )}
      >
        <span className={cn("h-2 w-2 shrink-0 rounded-full", statusClass)} />
        <span className="flex-1 truncate">{label}</span>
        <span className="text-[10px] text-[var(--c-muted)]">{statusLabel}</span>
      </button>
    </li>
  );
}

interface ArtifactDetailProps {
  artifact: SynthesisArtifact | null;
  emptyLabel: string;
  emptyHint: string;
  onRegenerate: () => void;
  regenerating: boolean;
}

function ArtifactDetail({
  artifact,
  emptyLabel,
  emptyHint,
  onRegenerate,
  regenerating,
}: ArtifactDetailProps) {
  if (!artifact) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-8 text-center">
        <p className="text-sm font-semibold text-[var(--c-muted)]">{emptyLabel}</p>
        <p className="mt-1 text-xs text-[var(--c-muted)]">{emptyHint}</p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={onRegenerate}
          disabled={regenerating}
        >
          {regenerating ? "Generating..." : "Generate"}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--c-muted)]">
            {artifact.kind.replace(/_/g, " ")}
          </p>
          <h4 className="font-display text-base font-semibold text-[var(--c-ink)]">
            {artifact.title}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone(artifact.status)}>{artifact.status}</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            disabled={regenerating}
          >
            {regenerating ? "..." : "Regenerate"}
          </Button>
        </div>
      </div>
      {artifact.summary ? (
        <p className="mb-3 whitespace-pre-wrap text-sm leading-6 text-[var(--c-body)]">
          {artifact.summary}
        </p>
      ) : null}
      {artifact.keyPoints && artifact.keyPoints.length > 0 ? (
        <div className="mt-3 rounded-lg border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--c-muted)]">
            Key Points
          </p>
          <ul className="space-y-1.5 text-xs text-[var(--c-body)]">
            {artifact.keyPoints.map((point, index) => (
              <li key={index} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent,#0f766e)]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {artifact.opposingViews && artifact.opposingViews.length > 0 ? (
        <div className="mt-3 rounded-lg border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--c-muted)]">
            Opposing Views
          </p>
          <ul className="space-y-1.5 text-xs text-[var(--c-body)]">
            {artifact.opposingViews.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {artifact.uniqueInsights && artifact.uniqueInsights.length > 0 ? (
        <div className="mt-3 rounded-lg border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--c-muted)]">
            Unique Insights
          </p>
          <ul className="space-y-1.5 text-xs text-[var(--c-body)]">
            {artifact.uniqueInsights.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {artifact.error ? (
        <p className="mt-3 text-xs text-[var(--c-error)]">Error: {artifact.error}</p>
      ) : null}
    </div>
  );
}

interface CategoryArtifactDetailProps {
  artifact: SynthesisArtifact | null;
  category: CategoryRef | null;
  regenerating: boolean;
  onRegenerate: () => void;
}

function CategoryArtifactDetail({
  artifact,
  category,
  regenerating,
  onRegenerate,
}: CategoryArtifactDetailProps) {
  return (
    <ArtifactDetail
      artifact={artifact}
      emptyLabel={`No summary generated yet for ${category?.name ?? "this category"}.`}
      emptyHint="Click Generate to summarise this category from the current threads."
      onRegenerate={onRegenerate}
      regenerating={regenerating}
    />
  );
}
