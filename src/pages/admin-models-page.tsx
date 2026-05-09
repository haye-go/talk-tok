import { ArrowsClockwise, GearSix, Plus } from "@phosphor-icons/react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const MOCK_PROVIDERS = [
  {
    name: "Anthropic",
    enabled: true,
    keyStatus: "set",
    models: ["claude-sonnet-4-5-20250514", "claude-haiku-4-5-20251001"],
  },
  { name: "OpenAI", enabled: false, keyStatus: "missing", models: [] },
];

const MOCK_FEATURE_ASSIGNMENTS = [
  { feature: "Private Feedback", model: "claude-sonnet-4-5-20250514", provider: "Anthropic" },
  { feature: "Categorization", model: "claude-sonnet-4-5-20250514", provider: "Anthropic" },
  { feature: "Fight Me", model: "claude-sonnet-4-5-20250514", provider: "Anthropic" },
  { feature: "Summary Generation", model: "claude-sonnet-4-5-20250514", provider: "Anthropic" },
  { feature: "Overlap Detection", model: "claude-haiku-4-5-20251001", provider: "Anthropic" },
  { feature: "Moderation", model: "claude-haiku-4-5-20251001", provider: "Anthropic" },
  { feature: "Reflection / Report", model: "claude-sonnet-4-5-20250514", provider: "Anthropic" },
];

export function AdminModelsPage() {
  return (
    <AdminShell
      title="Providers & Models"
      description="Manage LLM providers, model assignments, and pricing metadata."
    >
      <div className="grid gap-4">
        {/* Providers */}
        <Card
          title="Providers"
          action={
            <Button size="sm" variant="secondary" icon={<Plus size={14} />}>
              Add Provider
            </Button>
          }
        >
          <div className="grid gap-3">
            {MOCK_PROVIDERS.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
              >
                <div className="flex items-center gap-3">
                  <Switch checked={p.enabled} onCheckedChange={() => {}} label="" />
                  <div>
                    <p className="font-display text-sm font-medium text-[var(--c-ink)]">{p.name}</p>
                    <p className="text-[10px] text-[var(--c-muted)]">
                      API key:{" "}
                      {p.keyStatus === "set" ? (
                        <span className="text-[var(--c-success)]">configured</span>
                      ) : (
                        <span className="text-[var(--c-error)]">missing</span>
                      )}
                      {p.models.length > 0 && ` · ${p.models.length} models`}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" icon={<ArrowsClockwise size={14} />}>
                  Fetch Models
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Feature → Model assignment */}
        <Card
          title="Model per Feature"
          action={
            <Badge tone="neutral">
              <GearSix size={10} className="mr-0.5 inline" /> {MOCK_FEATURE_ASSIGNMENTS.length}{" "}
              features
            </Badge>
          }
        >
          <div className="divide-y divide-[var(--c-hairline)]">
            {MOCK_FEATURE_ASSIGNMENTS.map((fa) => (
              <div key={fa.feature} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-[var(--c-body)]">{fa.feature}</span>
                <div className="flex items-center gap-2">
                  <Badge tone="slate">{fa.model.split("-").slice(0, 2).join("-")}</Badge>
                  <span className="text-xs text-[var(--c-muted)]">{fa.provider}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Pricing metadata */}
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
                <tr className="border-b border-[var(--c-hairline)]">
                  <td className="py-2 pr-4 font-medium">claude-sonnet-4-5</td>
                  <td className="py-2 pr-4">$3.00</td>
                  <td className="py-2 pr-4">$0.30</td>
                  <td className="py-2">$15.00</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">claude-haiku-4-5</td>
                  <td className="py-2 pr-4">$0.80</td>
                  <td className="py-2 pr-4">$0.08</td>
                  <td className="py-2">$4.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
