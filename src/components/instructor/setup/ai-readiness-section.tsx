import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";

interface BaselineSnapshot {
  status?: string;
  provider?: string;
  model?: string;
  generatedAt?: number;
}

interface LlmFailure {
  id: string;
  feature: string;
  error?: string | null;
}

export interface AiReadinessSectionProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
  baseline: BaselineSnapshot | null;
  baselineBusy: boolean;
  baselineCanGenerate: boolean;
  openAiKeyState: "checking" | "ready" | "missing" | "error";
  modelsCount: number;
  promptsCount: number;
  budgetUsagePercent: number;
  missingModelFeatureLabels: string[];
  missingPromptKeys: string[];
  budgetHardStopActive: boolean;
  activeDemoToggleCount: number;
  recentLlmFailures: LlmFailure[];
}

export function AiReadinessSection({
  sessionSlug,
  selectedQuestionId,
  baseline,
  baselineBusy,
  baselineCanGenerate,
  openAiKeyState,
  modelsCount,
  promptsCount,
  budgetUsagePercent,
  missingModelFeatureLabels,
  missingPromptKeys,
  budgetHardStopActive,
  activeDemoToggleCount,
  recentLlmFailures,
}: AiReadinessSectionProps) {
  const generateBaseline = useMutation(api.questionBaselines.generateForQuestion);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateBaseline(forceRegenerate = false) {
    setError(null);
    try {
      await generateBaseline({
        sessionSlug,
        questionId: selectedQuestionId,
        forceRegenerate,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate baseline.");
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <Card title="Hidden Baseline Diagnostics">
        <p className="text-xs leading-5 text-[var(--c-muted)]">
          The baseline is the instructor-side reference answer used by private feedback and personal
          reports. Learners never see the baseline text.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <MetricTile label="Status" value={baseline?.status ?? "missing"} />
          <MetricTile label="Provider" value={baseline?.provider ?? "none"} />
          <MetricTile label="Model" value={baseline?.model ?? "none"} />
          <MetricTile
            label="Generated"
            value={
              baseline?.generatedAt
                ? new Date(baseline.generatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "not yet"
            }
          />
        </div>
        <Button
          className="mt-3 w-full"
          size="sm"
          variant="secondary"
          onClick={() => void handleGenerateBaseline(Boolean(baseline))}
          disabled={baselineBusy || !baselineCanGenerate}
        >
          {baselineBusy ? "Queued" : baseline ? "Regenerate Baseline" : "Generate Baseline"}
        </Button>
        {error ? <p className="mt-2 text-xs text-[var(--c-error)]">{error}</p> : null}
      </Card>

      <Card title="AI Readiness">
        <p className="text-xs leading-5 text-[var(--c-muted)]">
          Operational prerequisites that commonly block AI work: API key, enabled models, prompt
          templates, budget stops, demo failure toggles, and recent LLM errors.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <MetricTile label="OpenAI key" value={openAiKeyState} />
          <MetricTile label="Models" value={String(modelsCount)} />
          <MetricTile label="Prompts" value={String(promptsCount)} />
          <MetricTile label="Budget" value={`${budgetUsagePercent}%`} />
        </div>
        <div className="mt-3 grid gap-2 text-xs">
          <div className="rounded-sm bg-[var(--c-surface-strong)] p-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-[var(--c-ink)]">Model coverage</span>
              <Badge tone={missingModelFeatureLabels.length === 0 ? "success" : "warning"}>
                {missingModelFeatureLabels.length === 0 ? "ready" : "missing"}
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-[var(--c-muted)]">
              {missingModelFeatureLabels.length === 0
                ? "Enabled models cover all AI workflow features."
                : `Missing enabled model features: ${missingModelFeatureLabels.join(", ")}.`}
            </p>
          </div>

          <div className="rounded-sm bg-[var(--c-surface-strong)] p-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-[var(--c-ink)]">Prompt templates</span>
              <Badge tone={missingPromptKeys.length === 0 ? "success" : "warning"}>
                {missingPromptKeys.length === 0 ? "ready" : "missing"}
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-[var(--c-muted)]">
              {missingPromptKeys.length === 0
                ? "Required prompt templates are present."
                : `Missing prompts: ${missingPromptKeys.join(", ")}.`}
            </p>
          </div>

          <div className="rounded-sm bg-[var(--c-surface-strong)] p-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-[var(--c-ink)]">Budget and demo controls</span>
              <Badge tone={budgetHardStopActive || activeDemoToggleCount > 0 ? "warning" : "success"}>
                {budgetHardStopActive || activeDemoToggleCount > 0 ? "attention" : "clear"}
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-[var(--c-muted)]">
              {budgetHardStopActive
                ? "Budget hard stop is active for this session."
                : "No budget hard stop is currently blocking this session."}
            </p>
          </div>

          <div className="rounded-sm bg-[var(--c-surface-strong)] p-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-[var(--c-ink)]">Recent LLM failures</span>
              <Badge tone={recentLlmFailures.length === 0 ? "success" : "error"}>
                {recentLlmFailures.length}
              </Badge>
            </div>
            {recentLlmFailures.length === 0 ? (
              <p className="mt-1 text-[11px] text-[var(--c-muted)]">
                No recent LLM errors found for this session.
              </p>
            ) : (
              <div className="mt-1 grid gap-1">
                {recentLlmFailures.map((call) => (
                  <p key={call.id} className="text-[11px] leading-4 text-[var(--c-error)]">
                    {call.feature}: {call.error ?? "Unknown error"}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}
