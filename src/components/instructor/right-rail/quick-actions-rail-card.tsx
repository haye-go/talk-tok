import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

export interface QuickActionsRailCardProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
}

export function QuickActionsRailCard({
  sessionSlug,
  selectedQuestionId,
}: QuickActionsRailCardProps) {
  const triggerCategorisation = useMutation(api.categorisation.triggerForSession);
  const generateClassSynthesis = useMutation(api.synthesis.generateClassSynthesis);

  const [categorisationBusy, setCategorisationBusy] = useState(false);
  const [categorisationMessage, setCategorisationMessage] = useState<string | null>(null);
  const [categorisationError, setCategorisationError] = useState<string | null>(null);
  const [synthBusy, setSynthBusy] = useState(false);

  async function handleTriggerCategorisation() {
    setCategorisationBusy(true);
    setCategorisationMessage(null);
    setCategorisationError(null);
    try {
      const result = await triggerCategorisation({ sessionSlug, questionId: selectedQuestionId });
      setCategorisationMessage(
        typeof result === "string" ? result : "Categorisation queued.",
      );
    } catch (error) {
      setCategorisationError(
        error instanceof Error ? error.message : "Failed to queue categorisation.",
      );
    } finally {
      setCategorisationBusy(false);
    }
  }

  async function handleGenerateClassSynthesis() {
    if (!selectedQuestionId) return;
    setSynthBusy(true);
    try {
      await generateClassSynthesis({ sessionSlug, questionId: selectedQuestionId });
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
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void handleTriggerCategorisation()}
          disabled={categorisationBusy}
        >
          {categorisationBusy ? "Categorising..." : "Run categorisation"}
        </Button>
        {categorisationMessage ? (
          <p className="text-xs text-[var(--c-success)]">{categorisationMessage}</p>
        ) : null}
        {categorisationError ? (
          <p className="text-xs text-[var(--c-error)]">{categorisationError}</p>
        ) : null}
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
