import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useInstructorPreviewAuth } from "@/hooks/use-instructor-preview-auth";

type CategoryGenerationMode = "append" | "full_regeneration";
type CategoryAssignmentScope = "uncategorised_posts" | "all_posts";

export interface QuickActionsRailCardProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
  autoAssignUncertainCategories: boolean;
}

export function QuickActionsRailCard({
  sessionSlug,
  selectedQuestionId,
  autoAssignUncertainCategories,
}: QuickActionsRailCardProps) {
  const { previewPassword } = useInstructorPreviewAuth();
  const generateCategories = useMutation(api.categorisation.generateCategories);
  const assignCategories = useMutation(api.categorisation.assignCategories);
  const generateClassSynthesis = useMutation(api.synthesis.generateClassSynthesis);
  const updateSessionSettings = useMutation(api.instructorControls.updateSettings);

  const [generationMode, setGenerationMode] = useState<CategoryGenerationMode>("append");
  const [assignmentScope, setAssignmentScope] =
    useState<CategoryAssignmentScope>("uncategorised_posts");
  const [categoryBusy, setCategoryBusy] = useState<"generate" | "assign" | null>(null);
  const [categoryMessage, setCategoryMessage] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [synthBusy, setSynthBusy] = useState(false);

  async function handleGenerateCategories() {
    setCategoryBusy("generate");
    setCategoryMessage(null);
    setCategoryError(null);
    try {
      await generateCategories({
        sessionSlug,
        questionId: selectedQuestionId,
        mode: generationMode,
        previewPassword: previewPassword ?? "",
      });
      setCategoryMessage(
        generationMode === "append"
          ? "Category append queued."
          : "Full category regeneration queued.",
      );
    } catch (error) {
      setCategoryError(
        error instanceof Error ? error.message : "Failed to queue category generation.",
      );
    } finally {
      setCategoryBusy(null);
    }
  }

  async function handleAssignCategories() {
    setCategoryBusy("assign");
    setCategoryMessage(null);
    setCategoryError(null);
    try {
      await assignCategories({
        sessionSlug,
        questionId: selectedQuestionId,
        scope: assignmentScope,
        previewPassword: previewPassword ?? "",
      });
      setCategoryMessage(
        assignmentScope === "uncategorised_posts"
          ? "Uncategorised post assignment queued."
          : "All-post reassignment queued.",
      );
    } catch (error) {
      setCategoryError(
        error instanceof Error ? error.message : "Failed to queue category assignment.",
      );
    } finally {
      setCategoryBusy(null);
    }
  }

  async function handleToggleUncertainCategories() {
    setToggleBusy(true);
    setCategoryMessage(null);
    setCategoryError(null);
    try {
      await updateSessionSettings({
        sessionSlug,
        autoAssignUncertainCategories: !autoAssignUncertainCategories,
        previewPassword: previewPassword ?? "",
      });
      setCategoryMessage(
        !autoAssignUncertainCategories
          ? "Unsure categories will be auto-assigned."
          : "Unsure categories will need review.",
      );
    } catch (error) {
      setCategoryError(
        error instanceof Error ? error.message : "Failed to update category assignment mode.",
      );
    } finally {
      setToggleBusy(false);
    }
  }

  async function handleGenerateClassSynthesis() {
    if (!selectedQuestionId) return;
    setSynthBusy(true);
    try {
      await generateClassSynthesis({
        sessionSlug,
        questionId: selectedQuestionId,
        previewPassword: previewPassword ?? "",
      });
    } finally {
      setSynthBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#eadfcb] bg-[#fffaf2]/75 p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">
        Quick Live Actions
      </p>
      <div className="grid gap-2">
        <div className="rounded-xl border border-[#eadfcb] bg-white/60 p-3">
          <p className="text-xs font-semibold text-[var(--c-ink)]">Generate Categories</p>
          <div className="mt-2 grid gap-1.5 text-xs text-[var(--c-muted)]">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="category-generation-mode"
                checked={generationMode === "append"}
                onChange={() => setGenerationMode("append")}
              />
              Append missing categories
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="category-generation-mode"
                checked={generationMode === "full_regeneration"}
                onChange={() => setGenerationMode("full_regeneration")}
              />
              Full regeneration
            </label>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3 w-full"
            onClick={() => void handleGenerateCategories()}
            disabled={categoryBusy !== null}
          >
            {categoryBusy === "generate" ? "Generating..." : "Generate Categories"}
          </Button>
        </div>

        <div className="rounded-xl border border-[#eadfcb] bg-white/60 p-3">
          <p className="text-xs font-semibold text-[var(--c-ink)]">Assign Categories</p>
          <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-[#eadfcb] bg-[#fffaf2] px-3 py-2">
            <span className="text-xs leading-4 text-[var(--c-muted)]">
              Auto-assign unsure categories
            </span>
            <button
              type="button"
              disabled={toggleBusy}
              onClick={() => void handleToggleUncertainCategories()}
              className={[
                "rounded-full px-2.5 py-1 text-[10px] font-bold transition",
                autoAssignUncertainCategories
                  ? "bg-[#dff6f0] text-[#0f766e] hover:bg-[#cdebd9]"
                  : "bg-[#edf2f7] text-[var(--c-muted)] hover:bg-[#dfe6ed]",
                toggleBusy ? "cursor-wait opacity-70" : "cursor-pointer",
              ].join(" ")}
              aria-pressed={autoAssignUncertainCategories}
            >
              {toggleBusy ? "Saving" : autoAssignUncertainCategories ? "On" : "Off"}
            </button>
          </div>
          <div className="mt-2 grid gap-1.5 text-xs text-[var(--c-muted)]">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="category-assignment-scope"
                checked={assignmentScope === "uncategorised_posts"}
                onChange={() => setAssignmentScope("uncategorised_posts")}
              />
              Uncategorised posts only
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="category-assignment-scope"
                checked={assignmentScope === "all_posts"}
                onChange={() => setAssignmentScope("all_posts")}
              />
              All posts
            </label>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3 w-full"
            onClick={() => void handleAssignCategories()}
            disabled={categoryBusy !== null}
          >
            {categoryBusy === "assign" ? "Assigning..." : "Assign Categories"}
          </Button>
        </div>

        {categoryMessage ? (
          <p className="text-xs text-[var(--c-success)]">{categoryMessage}</p>
        ) : null}
        {categoryError ? <p className="text-xs text-[var(--c-error)]">{categoryError}</p> : null}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void handleGenerateClassSynthesis()}
          disabled={synthBusy || !selectedQuestionId}
        >
          {synthBusy ? "Generating..." : "Generate synthesis"}
        </Button>
      </div>
    </section>
  );
}
