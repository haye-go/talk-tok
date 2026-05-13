import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AI_READINESS_FEATURES = [
  { feature: "feedback", label: "Feedback", promptKey: "feedback.private.v1" },
  { feature: "question_baseline", label: "Baseline", promptKey: "question.baseline.v1" },
  { feature: "categorisation", label: "Categorisation", promptKey: "categorisation.session.v1" },
  { feature: "synthesis", label: "Synthesis", promptKey: "synthesis.class.v1" },
  { feature: "personal_report", label: "Reports", promptKey: "report.personal.v1" },
  { feature: "argument_map", label: "Argument map", promptKey: "argument_map.session.v1" },
  { feature: "embedding", label: "Embeddings", promptKey: null },
] as const;

type ReadinessTone = "success" | "warning" | "error" | "neutral";

interface BaselineSnapshot {
  status?: string;
  provider?: string;
  model?: string;
  generatedAt?: number;
}

export interface AiReadinessSectionProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
  sessionId: Id<"sessions"> | undefined;
  baseline: BaselineSnapshot | null;
  baselineBusy: boolean;
  baselineCanGenerate: boolean;
}

function toneDotClass(tone: ReadinessTone) {
  switch (tone) {
    case "success":
      return "bg-[var(--c-success)]";
    case "warning":
      return "bg-[var(--c-warning)]";
    case "error":
      return "bg-[var(--c-error)]";
    default:
      return "bg-[var(--c-hairline)]";
  }
}

interface ReadinessRowProps {
  tone: ReadinessTone;
  label: string;
  badge: string;
  detail?: string;
}

function ReadinessRow({ tone, label, badge, detail }: ReadinessRowProps) {
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5">
      <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", toneDotClass(tone))} />
      <span className="text-sm font-medium text-[var(--c-ink)]">{label}</span>
      <Badge tone={tone}>{badge}</Badge>
      {detail ? (
        <p className="col-start-2 col-span-2 text-[11px] leading-4 text-[var(--c-muted)]">
          {detail}
        </p>
      ) : null}
    </li>
  );
}

interface StatPairProps {
  label: string;
  value: string;
}

function StatPair({ label, value }: StatPairProps) {
  return (
    <span>
      <span className="text-[var(--c-muted)]">{label}:</span>{" "}
      <strong className="font-mono text-[var(--c-ink)]">{value}</strong>
    </span>
  );
}

export function AiReadinessSection({
  sessionSlug,
  selectedQuestionId,
  sessionId,
  baseline,
  baselineBusy,
  baselineCanGenerate,
}: AiReadinessSectionProps) {
  const generateBaseline = useMutation(api.questionBaselines.generateForQuestion);
  const checkOpenAiKey = useAction(api.modelSettings.checkOpenAiKey);
  const modelSettings = useQuery(api.modelSettings.list);
  const promptTemplates = useQuery(api.promptTemplates.list);
  const sessionBudget = useQuery(
    api.budget.getSessionSpend,
    sessionId ? { sessionId } : "skip",
  );
  const recentLlmCalls = useQuery(api.llmObservability.recentCalls, { sessionSlug, limit: 12 });
  const demoToggles = useQuery(api.demo.listToggles, {});

  const [openAiKeyState, setOpenAiKeyState] = useState<
    "checking" | "ready" | "missing" | "error"
  >("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void checkOpenAiKey()
      .then((result) => {
        if (!cancelled) setOpenAiKeyState(result.hasKey ? "ready" : "missing");
      })
      .catch(() => {
        if (!cancelled) setOpenAiKeyState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [checkOpenAiKey]);

  const enabledModelFeatures = new Set(
    (modelSettings ?? []).filter((setting) => setting.enabled).flatMap((setting) => setting.features ?? []),
  );
  const promptKeys = new Set((promptTemplates ?? []).map((template) => template.key));
  const missingModelFeatureLabels = AI_READINESS_FEATURES.filter(
    (item) => !enabledModelFeatures.has(item.feature),
  ).map((item) => item.label);
  const missingPromptKeys = AI_READINESS_FEATURES.filter(
    (item) => item.promptKey && !promptKeys.has(item.promptKey),
  )
    .map((item) => item.promptKey)
    .filter(Boolean) as string[];
  const activeDemoToggleCount = (demoToggles ?? []).filter(
    (toggle) =>
      toggle.enabled &&
      ["simulateAiFailure", "simulateBudgetExceeded", "simulateSlowAi"].includes(toggle.key),
  ).length;
  const recentLlmFailures = (recentLlmCalls ?? [])
    .filter((call) => call.status === "error")
    .slice(0, 3);
  const budgetUsagePercent =
    sessionBudget && sessionBudget.perSessionEstimatedCostUsd > 0
      ? Math.round(
          (sessionBudget.totalEstimatedCostUsd / sessionBudget.perSessionEstimatedCostUsd) * 100,
        )
      : 0;
  const budgetHardStopActive = sessionBudget
    ? Boolean(sessionBudget.hardStopEnabled) &&
      sessionBudget.totalEstimatedCostUsd >= sessionBudget.perSessionEstimatedCostUsd
    : false;
  const modelsCount = modelSettings?.length ?? 0;
  const promptsCount = promptTemplates?.length ?? 0;

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

  const openAiKeyTone: ReadinessTone =
    openAiKeyState === "ready"
      ? "success"
      : openAiKeyState === "missing"
        ? "warning"
        : openAiKeyState === "error"
          ? "error"
          : "neutral";

  return (
    <div className="grid gap-6">
      <section>
        <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--c-hairline)] pb-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
              Hidden Baseline Diagnostics
            </p>
            <p className="mt-1 text-xs text-[var(--c-muted)]">
              Instructor-side reference answer used by private feedback and personal reports. Never
              shown to learners.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void handleGenerateBaseline(Boolean(baseline))}
            disabled={baselineBusy || !baselineCanGenerate}
          >
            {baselineBusy ? "Queued" : baseline ? "Regenerate Baseline" : "Generate Baseline"}
          </Button>
        </header>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs">
          <StatPair label="Status" value={baseline?.status ?? "missing"} />
          <StatPair label="Provider" value={baseline?.provider ?? "none"} />
          <StatPair label="Model" value={baseline?.model ?? "none"} />
          <StatPair
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
        {error ? <p className="mt-2 text-xs text-[var(--c-error)]">{error}</p> : null}
      </section>

      <section>
        <header className="border-b border-[var(--c-hairline)] pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
            AI Readiness
          </p>
          <p className="mt-1 text-xs text-[var(--c-muted)]">
            Operational prerequisites that commonly block AI work.
          </p>
        </header>
        <ul className="mt-3 divide-y divide-[var(--c-hairline)] rounded-2xl border border-[var(--c-hairline)] bg-[var(--c-surface-soft)]">
          <ReadinessRow tone={openAiKeyTone} label="OpenAI key" badge={openAiKeyState} />
          <ReadinessRow
            tone={modelsCount > 0 ? "success" : "warning"}
            label="Models"
            badge={`${modelsCount} enabled`}
          />
          <ReadinessRow
            tone={promptsCount > 0 ? "success" : "warning"}
            label="Prompts"
            badge={`${promptsCount} templates`}
          />
          <ReadinessRow
            tone={missingModelFeatureLabels.length === 0 ? "success" : "warning"}
            label="Model coverage"
            badge={missingModelFeatureLabels.length === 0 ? "ready" : "missing"}
            detail={
              missingModelFeatureLabels.length === 0
                ? "Enabled models cover all AI workflow features."
                : `Missing: ${missingModelFeatureLabels.join(", ")}.`
            }
          />
          <ReadinessRow
            tone={missingPromptKeys.length === 0 ? "success" : "warning"}
            label="Prompt templates"
            badge={missingPromptKeys.length === 0 ? "ready" : "missing"}
            detail={
              missingPromptKeys.length === 0
                ? "Required prompt templates are present."
                : `Missing: ${missingPromptKeys.join(", ")}.`
            }
          />
          <ReadinessRow
            tone={budgetHardStopActive ? "warning" : "success"}
            label="Budget"
            badge={`${budgetUsagePercent}%`}
            detail={
              budgetHardStopActive
                ? "Budget hard stop is active for this session."
                : "No budget hard stop blocking this session."
            }
          />
          <ReadinessRow
            tone={activeDemoToggleCount > 0 ? "warning" : "success"}
            label="Demo failure toggles"
            badge={activeDemoToggleCount > 0 ? "attention" : "clear"}
          />
          <ReadinessRow
            tone={recentLlmFailures.length === 0 ? "success" : "error"}
            label="Recent LLM failures"
            badge={String(recentLlmFailures.length)}
            detail={
              recentLlmFailures.length === 0
                ? "No recent errors found for this session."
                : recentLlmFailures
                    .map((call) => `${call.feature}: ${call.error ?? "Unknown error"}`)
                    .join(" / ")
            }
          />
        </ul>
      </section>
    </div>
  );
}
