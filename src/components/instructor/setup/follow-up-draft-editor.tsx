import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CategoryItem {
  id: Id<"categories">;
  name: string;
}

interface FollowUpPrompt {
  id: Id<"followUpPrompts">;
  title: string;
  prompt: string;
  status: "draft" | "active" | "closed" | "archived";
  targetMode: string;
  activatedAt?: number;
  closedAt?: number;
  createdAt: number;
}

export interface FollowUpDraftEditorProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
  categories: CategoryItem[];
  followUps: FollowUpPrompt[];
}

export function FollowUpDraftEditor({
  sessionSlug,
  selectedQuestionId,
  categories,
  followUps,
}: FollowUpDraftEditorProps) {
  const createFollowUp = useMutation(api.followUps.create);

  const [openCategoryId, setOpenCategoryId] = useState<Id<"categories"> | null>(null);
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  function startNew(category: CategoryItem) {
    setOpenCategoryId(category.id);
    setFollowUpPrompt(
      `What is one strong counterpoint or extension to the "${category.name}" view?`,
    );
    setFollowUpError(null);
  }

  async function handleSubmit(categoryId: Id<"categories">) {
    setFollowUpError(null);
    setSavingFollowUp(true);
    try {
      const category = categories.find((cat) => cat.id === categoryId);
      await createFollowUp({
        sessionSlug,
        questionId: selectedQuestionId,
        title: `Follow-up: ${category?.name ?? "category"}`,
        prompt: followUpPrompt.trim(),
        targetMode: "categories",
        categoryIds: [categoryId],
        activateNow: true,
      });
      setOpenCategoryId(null);
      setFollowUpPrompt("");
    } catch (cause) {
      setFollowUpError(cause instanceof Error ? cause.message : "Could not create follow-up.");
    } finally {
      setSavingFollowUp(false);
    }
  }

  return (
    <section>
      <header className="border-b border-[var(--c-hairline)] pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
          Follow-up Prompts · {followUps.length} total
        </p>
        <p className="mt-1 text-xs text-[var(--c-muted)]">
          Draft per category. Launch them from Room or the right rail during live facilitation.
        </p>
      </header>

      {followUps.length > 0 ? (
        <div className="mt-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--c-muted)]">
            Existing drafts
          </p>
          <ul className="grid gap-0 border-t border-[var(--c-hairline)]">
            {followUps.slice(0, 8).map((prompt) => (
              <li
                key={prompt.id}
                className="flex items-start justify-between gap-3 border-b border-[var(--c-hairline)] py-2 text-sm last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-display font-medium text-[var(--c-ink)]">
                    {prompt.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--c-muted)]">{prompt.prompt}</p>
                </div>
                <Badge
                  tone={
                    prompt.status === "active"
                      ? "success"
                      : prompt.status === "draft"
                        ? "neutral"
                        : "warning"
                  }
                >
                  {prompt.status}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--c-muted)]">
          Create per-category follow-up
        </p>
        <ul className="grid gap-0 border-t border-[var(--c-hairline)]">
          {categories.map((category) => (
            <li
              key={category.id}
              className="border-b border-[var(--c-hairline)] py-2 last:border-b-0"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-sm font-medium text-[var(--c-ink)]">
                  {category.name}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    openCategoryId === category.id ? setOpenCategoryId(null) : startNew(category)
                  }
                >
                  {openCategoryId === category.id ? "Cancel" : "Draft follow-up"}
                </Button>
              </div>

              {openCategoryId === category.id ? (
                <form
                  className="mt-2 grid gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSubmit(category.id);
                  }}
                >
                  <textarea
                    value={followUpPrompt}
                    onChange={(event) => setFollowUpPrompt(event.target.value)}
                    rows={3}
                    placeholder="Follow-up question for this category"
                    className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm text-[var(--c-ink)]"
                  />
                  {followUpError ? (
                    <p className="text-xs text-[var(--c-error)]">{followUpError}</p>
                  ) : null}
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingFollowUp || followUpPrompt.trim().length < 5}
                  >
                    {savingFollowUp ? "Sending..." : "Send"}
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
          {categories.length === 0 ? (
            <li className="py-2 text-xs text-[var(--c-muted)]">
              Add a category first to draft a category-targeted follow-up.
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
