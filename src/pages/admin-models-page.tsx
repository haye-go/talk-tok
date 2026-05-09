import { GearSix } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/state/loading-state";

export function AdminModelsPage() {
  const models = useQuery(api.modelSettings.list);

  return (
    <AdminShell
      title="Providers & Models"
      description="Manage LLM providers, model assignments, and pricing metadata."
    >
      <div className="grid gap-4">
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
                  <div key={model._id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-display text-sm font-medium text-[var(--c-ink)]">
                        {model.model}
                      </p>
                      <p className="text-[10px] text-[var(--c-muted)]">
                        {model.provider} · {model.enabled ? "enabled" : "disabled"}
                        {model.features.length > 0 && ` · ${model.features.join(", ")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={model.enabled ? "success" : "neutral"}>
                        {model.enabled ? "active" : "off"}
                      </Badge>
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
