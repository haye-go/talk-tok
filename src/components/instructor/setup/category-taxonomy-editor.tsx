import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { categoryColorToTone } from "@/lib/category-colors";

interface CategoryItem {
  id: Id<"categories">;
  name: string;
  description?: string;
  color?: string;
  assignmentCount?: number;
}

export interface CategoryTaxonomyEditorProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
  categories: CategoryItem[];
}

export function CategoryTaxonomyEditor({
  sessionSlug,
  selectedQuestionId,
  categories,
}: CategoryTaxonomyEditorProps) {
  const createCategory = useMutation(api.categoryManagement.create);
  const updateCategory = useMutation(api.categoryManagement.update);

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [addCategoryName, setAddCategoryName] = useState("");
  const [addCategoryDescription, setAddCategoryDescription] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<Id<"categories"> | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryDescription, setEditingCategoryDescription] = useState("");

  async function handleCreateCategory() {
    setCategoryError(null);
    setSavingCategory(true);
    try {
      await createCategory({
        sessionSlug,
        questionId: selectedQuestionId,
        name: addCategoryName.trim(),
        description: addCategoryDescription.trim() || undefined,
      });
      setAddCategoryName("");
      setAddCategoryDescription("");
      setShowAddCategory(false);
    } catch (cause) {
      setCategoryError(cause instanceof Error ? cause.message : "Could not create category.");
    } finally {
      setSavingCategory(false);
    }
  }

  function startRename(category: CategoryItem) {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryDescription(category.description ?? "");
    setCategoryError(null);
  }

  async function handleRenameCategory(categoryId: Id<"categories">) {
    setCategoryError(null);
    setSavingCategory(true);
    try {
      await updateCategory({
        sessionSlug,
        categoryId,
        name: editingCategoryName.trim(),
        description: editingCategoryDescription.trim() || undefined,
      });
      setEditingCategoryId(null);
    } catch (cause) {
      setCategoryError(cause instanceof Error ? cause.message : "Could not update category.");
    } finally {
      setSavingCategory(false);
    }
  }

  return (
    <Card title="Category Taxonomy" eyebrow={`${categories.length} active`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs leading-5 text-[var(--c-muted)]">
          Category editing lives in Setup. Room Categories is a live reading board.
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            setCategoryError(null);
            setShowAddCategory((value) => !value);
          }}
        >
          + Add
        </Button>
      </div>

      {showAddCategory ? (
        <form
          className="mb-4 grid gap-2 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreateCategory();
          }}
        >
          <input
            value={addCategoryName}
            onChange={(event) => setAddCategoryName(event.target.value)}
            placeholder="Category name"
            className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm text-[var(--c-ink)]"
          />
          <textarea
            value={addCategoryDescription}
            onChange={(event) => setAddCategoryDescription(event.target.value)}
            placeholder="Short description"
            rows={2}
            className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm text-[var(--c-ink)]"
          />
          {categoryError ? (
            <p className="text-xs text-[var(--c-error)]">{categoryError}</p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={savingCategory || addCategoryName.trim().length < 2}
            >
              {savingCategory ? "Saving..." : "Create"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowAddCategory(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-3">
        {categories.map((category, index) => (
          <div
            key={category.id}
            className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
            style={{
              borderLeft: `4px solid var(--c-sig-${categoryColorToTone(category.color, index)})`,
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-sm font-semibold text-[var(--c-ink)]">
                  {category.name}
                </p>
                {category.description ? (
                  <p className="mt-1 text-xs leading-5 text-[var(--c-muted)]">
                    {category.description}
                  </p>
                ) : null}
              </div>
              {category.assignmentCount !== undefined ? (
                <Badge tone="neutral">{category.assignmentCount}</Badge>
              ) : null}
            </div>

            {editingCategoryId === category.id ? (
              <form
                className="mt-3 grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleRenameCategory(category.id);
                }}
              >
                <input
                  value={editingCategoryName}
                  onChange={(event) => setEditingCategoryName(event.target.value)}
                  className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm text-[var(--c-ink)]"
                />
                <textarea
                  value={editingCategoryDescription}
                  onChange={(event) => setEditingCategoryDescription(event.target.value)}
                  rows={2}
                  className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm text-[var(--c-ink)]"
                />
                {categoryError ? (
                  <p className="text-xs text-[var(--c-error)]">{categoryError}</p>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingCategory || editingCategoryName.trim().length < 2}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingCategoryId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => startRename(category)}
                >
                  Rename
                </Button>
              </div>
            )}
          </div>
        ))}
        {categories.length === 0 ? (
          <p className="rounded-sm bg-[var(--c-surface-strong)] px-3 py-2 text-xs text-[var(--c-muted)]">
            No categories yet. Use + Add to create one.
          </p>
        ) : null}
      </div>
    </Card>
  );
}
