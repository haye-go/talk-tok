import { useState } from "react";
import { PlusCircle } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useInstructorPreviewAuth } from "@/hooks/use-instructor-preview-auth";
import { categoryColorToTone } from "@/lib/category-colors";
import { splitAndSortAnsweredThreads, type ThreadSortMode } from "@/lib/thread-sorting";
import { ThreadCard, type ThreadCardData } from "./thread-card";

interface CategoryGroup {
  category: {
    id: Id<"categories">;
    name: string;
    description?: string;
    color?: string;
  };
  threads: ThreadCardData[];
}

function ThreadSectionList({
  threads,
  sortMode,
}: {
  threads: ThreadCardData[];
  sortMode: ThreadSortMode;
}) {
  const { openThreads, answeredThreads } = splitAndSortAnsweredThreads(threads, sortMode);

  return (
    <div className="grid gap-3">
      {openThreads.map((thread) => (
        <ThreadCard key={thread.root.submission.id} thread={thread} />
      ))}
      {answeredThreads.length > 0 ? (
        <div className="mt-1 grid gap-3 border-t border-[var(--c-hairline)] pt-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-display text-sm font-medium text-[var(--c-ink)]">Answered</h4>
            <span className="text-[11px] font-medium text-[var(--c-muted)]">
              {answeredThreads.length} answered
            </span>
          </div>
          {answeredThreads.map((thread) => (
            <ThreadCard key={thread.root.submission.id} thread={thread} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export interface RoomCategoriesBoardProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
  categoryGroups: CategoryGroup[];
  uncategorizedThreads: ThreadCardData[];
  sortMode: ThreadSortMode;
}

export function RoomCategoriesBoard({
  sessionSlug,
  selectedQuestionId,
  categoryGroups,
  uncategorizedThreads,
  sortMode,
}: RoomCategoriesBoardProps) {
  const { previewPassword } = useInstructorPreviewAuth();
  const createCategory = useMutation(api.categoryManagement.create);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const trimmedName = categoryName.trim();
  const canSubmit = trimmedName.length >= 2 && !saving;

  async function handleCreateCategory() {
    setCreateError(null);

    if (!previewPassword) {
      setCreateError("Unlock instructor access before creating categories.");
      return;
    }

    setSaving(true);
    try {
      await createCategory({
        previewPassword,
        sessionSlug,
        questionId: selectedQuestionId,
        name: trimmedName,
        description: categoryDescription.trim() || undefined,
      });
      setCategoryName("");
      setCategoryDescription("");
      setShowCreateForm(false);
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : "Could not create category.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-medium text-[var(--c-ink)]">By category</h2>
          <p className="text-xs text-[var(--c-muted)]">
            Read live threads, create buckets, then assign posts when the room needs structure.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={<PlusCircle size={15} />}
          onClick={() => {
            setCreateError(null);
            setShowCreateForm((value) => !value);
          }}
        >
          Create category
        </Button>
      </div>

      {showCreateForm ? (
        <Card>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreateCategory();
            }}
          >
            <div>
              <label
                htmlFor="room-category-name"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]"
              >
                Category name
              </label>
              <input
                id="room-category-name"
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                aria-invalid={Boolean(createError)}
                placeholder="e.g. Implementation concerns"
                className="mt-1 min-h-11 w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm text-[var(--c-ink)] outline-none transition focus:border-[var(--c-primary)]"
                autoFocus
              />
            </div>
            <div>
              <label
                htmlFor="room-category-description"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]"
              >
                Short description
              </label>
              <textarea
                id="room-category-description"
                value={categoryDescription}
                onChange={(event) => setCategoryDescription(event.target.value)}
                placeholder="Optional: what belongs in this category?"
                rows={2}
                className="mt-1 w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm text-[var(--c-ink)] outline-none transition focus:border-[var(--c-primary)]"
              />
            </div>
            {createError ? (
              <p className="text-xs text-[var(--c-error)]" role="alert">
                {createError}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[var(--c-muted)]">
                New categories are scoped to the selected question.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCategoryName("");
                    setCategoryDescription("");
                    setCreateError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!canSubmit}>
                  {saving ? "Creating..." : "Create category"}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      ) : null}

      {uncategorizedThreads.length > 0 ? (
        <section className="rounded-lg border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Badge tone="warning">Uncategorized</Badge>
            <span className="text-[11px] text-[var(--c-muted)]">
              {uncategorizedThreads.length}{" "}
              {uncategorizedThreads.length === 1 ? "message" : "messages"}
            </span>
          </div>
          <ThreadSectionList threads={uncategorizedThreads} sortMode={sortMode} />
        </section>
      ) : null}

      {categoryGroups.length === 0 && uncategorizedThreads.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--c-muted)]">
            No submissions yet. You can still create categories before posts arrive.
          </p>
        </Card>
      ) : null}

      {categoryGroups.map(({ category, threads }, index) => (
        <section
          key={category.id}
          className="rounded-lg border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Badge tone={categoryColorToTone(category.color, index)}>{category.name}</Badge>
            <span className="text-[11px] text-[var(--c-muted)]">
              {threads.length} {threads.length === 1 ? "message" : "messages"}
            </span>
          </div>
          {category.description ? (
            <p className="mb-3 text-xs text-[var(--c-muted)]">{category.description}</p>
          ) : null}
          {threads.length > 0 ? (
            <ThreadSectionList threads={threads} sortMode={sortMode} />
          ) : (
            <Card>
              <p className="text-sm text-[var(--c-muted)]">
                No threads assigned here yet. Use this bucket as posts come in.
              </p>
            </Card>
          )}
        </section>
      ))}
    </section>
  );
}
