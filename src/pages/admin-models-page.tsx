import { GearSix } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/state/loading-state";
import { useInstructorPreviewAuth } from "@/hooks/use-instructor-preview-auth";

export function AdminModelsPage() {
  const { previewPassword } = useInstructorPreviewAuth();
  const models = useQuery(api.modelSettings.list, previewPassword ? { previewPassword } : "skip");
  const updateModel = useMutation(api.modelSettings.update);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleToggleModel(model: Doc<"modelSettings">) {
    if (!previewPassword || savingKey) {
      return;
    }

    setSavingKey(model.key);
    setErrorMessage(null);

    try {
      await updateModel({
        previewPassword,
        key: model.key,
        provider: model.provider,
        model: model.model,
        enabled: !model.enabled,
        features: model.features,
        inputCostPerMillion: model.inputCostPerMillion,
        cachedInputCostPerMillion: model.cachedInputCostPerMillion,
        outputCostPerMillion: model.outputCostPerMillion,
        reasoningCostPerMillion: model.reasoningCostPerMillion,
        variablesJson: model.variablesJson,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update model setting.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <AdminShell
      title="Providers & Models"
      description="Manage LLM providers, model assignments, and pricing metadata."
    >
      <div className="grid gap-4">
        <Card title="Status">
          <p className="text-sm text-[var(--c-muted)]">
            Toggle model availability here. Feature reassignment and pricing edits still use the
            backend configuration for now.
          </p>
        </Card>

        {errorMessage ? (
          <Card tone="alert" title="Model update failed">
            <p className="text-sm text-[var(--c-muted)]">{errorMessage}</p>
          </Card>
        ) : null}

        {models === undefined && <LoadingState label="Loading model settings..." />}

        {models && models.length === 0 && (
          <Card>
            <p className="text-sm text-[var(--c-muted)]">
              No model settings configured. Run seed defaults to create initial entries.
            </p>
          </Card>
        )}

        {models && models.length > 0 && (
          <>
            <Card
              title="Configured Models"
              action={
                <Badge tone="neutral">
                  <GearSix size={10} className="mr-0.5 inline" /> {models.length} models
                </Badge>
              }
            >
              <div className="divide-y divide-[var(--c-hairline)]">
                {models.map((model) => (
                  <div
                    key={model._id}
                    className="flex flex-col gap-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-sm font-medium text-[var(--c-ink)]">
                        {model.model}
                      </p>
                      <p className="text-[10px] text-[var(--c-muted)] sm:max-w-[72ch]">
                        {model.provider} - {model.enabled ? "enabled" : "disabled"}
                        {model.features.length > 0 && ` - ${model.features.join(", ")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Badge tone={model.enabled ? "success" : "neutral"}>
                        {model.enabled ? "active" : "off"}
                      </Badge>
                      <Button
                        type="button"
                        variant={model.enabled ? "secondary" : "primary"}
                        size="sm"
                        disabled={savingKey !== null}
                        aria-label={`${model.enabled ? "Disable" : "Enable"} ${model.model}`}
                        onClick={() => void handleToggleModel(model)}
                      >
                        {savingKey === model.key
                          ? "Saving..."
                          : model.enabled
                            ? "Disable"
                            : "Enable"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Token Pricing" eyebrow="Per 1M tokens">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--c-hairline)] text-left text-[var(--c-muted)]">
                      <th className="py-2 pr-4 font-medium">Model</th>
                      <th className="py-2 pr-4 font-medium">Input</th>
                      <th className="py-2 pr-4 font-medium">Cached</th>
                      <th className="py-2 font-medium">Output</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--c-body)]">
                    {models.map((model) => (
                      <tr key={model._id} className="border-b border-[var(--c-hairline)]">
                        <td className="py-2 pr-4 font-medium">{model.model}</td>
                        <td className="py-2 pr-4">${model.inputCostPerMillion.toFixed(2)}</td>
                        <td className="py-2 pr-4">
                          ${(model.cachedInputCostPerMillion ?? 0).toFixed(2)}
                        </td>
                        <td className="py-2">${model.outputCostPerMillion.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  );
}
