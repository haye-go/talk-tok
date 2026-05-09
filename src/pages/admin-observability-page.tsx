import { Export } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { LoadingState } from "@/components/state/loading-state";

export function AdminObservabilityPage() {
  const summary = useQuery(api.llmObservability.summary, {});
  const recentCalls = useQuery(api.llmObservability.recentCalls, { limit: 20 });

  return (
    <AdminShell title="Observability" description="LLM usage, costs, latency, and error tracking.">
      <div className="grid gap-4">
        {summary === undefined && <LoadingState label="Loading observability..." />}

        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <MetricTile label="Total Calls" value={String(summary.totalCalls)} />
            <MetricTile label="Est. Cost" value={`$${summary.totalEstimatedCostUsd.toFixed(2)}`} />
            <MetricTile label="Total Tokens" value={`${Math.round(summary.totalTokens / 1000)}k`} />
            <MetricTile label="Avg Latency" value={summary.averageLatencyMs ? `${Math.round(summary.averageLatencyMs)}ms` : "—"} />
            <MetricTile label="Errors" value={String(summary.errorCount)} />
          </div>
        )}

        {summary?.byFeature && Object.keys(summary.byFeature).length > 0 && (
          <Card title="Breakdown by Feature">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--c-hairline)] text-left text-[var(--c-muted)]">
                    <th className="py-2 pr-4 font-medium">Feature</th>
                    <th className="py-2 pr-4 font-medium">Calls</th>
                    <th className="py-2 pr-4 font-medium">Cost</th>
                    <th className="py-2 font-medium">Errors</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--c-body)]">
                  {Object.entries(summary.byFeature).map(([feature, data]) => (
                    <tr key={feature} className="border-b border-[var(--c-hairline)]">
                      <td className="py-2 pr-4 font-medium">{feature}</td>
                      <td className="py-2 pr-4">{(data as { calls: number }).calls}</td>
                      <td className="py-2 pr-4">${((data as { estimatedCostUsd: number }).estimatedCostUsd ?? 0).toFixed(3)}</td>
                      <td className="py-2">{(data as { errors: number }).errors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Card
          title="Recent Calls"
          action={<Button size="sm" variant="ghost" icon={<Export size={14} />}>Export</Button>}
        >
          {recentCalls === undefined && <LoadingState label="Loading calls..." />}
          {recentCalls && recentCalls.length === 0 && (
            <p className="text-sm text-[var(--c-muted)]">No LLM calls recorded yet.</p>
          )}
          {recentCalls && recentCalls.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--c-hairline)] text-left text-[var(--c-muted)]">
                    <th className="py-2 pr-3 font-medium">Time</th>
                    <th className="py-2 pr-3 font-medium">Feature</th>
                    <th className="py-2 pr-3 font-medium">Model</th>
                    <th className="py-2 pr-3 font-medium">Tokens</th>
                    <th className="py-2 pr-3 font-medium">Latency</th>
                    <th className="py-2 pr-3 font-medium">Cost</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--c-body)]">
                  {recentCalls.map((call) => (
                    <tr key={call._id} className="border-b border-[var(--c-hairline)] transition-colors hover:bg-[var(--c-surface-soft)]">
                      <td className="py-2 pr-3 font-mono">
                        {new Date(call.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td className="py-2 pr-3">{call.feature}</td>
                      <td className="py-2 pr-3"><Badge tone="slate" className="text-[9px]">{call.model}</Badge></td>
                      <td className="py-2 pr-3 font-mono">{call.inputTokens ?? 0}/{call.outputTokens ?? 0}</td>
                      <td className="py-2 pr-3">{call.latencyMs ? `${call.latencyMs}ms` : "—"}</td>
                      <td className="py-2 pr-3">{call.estimatedCostUsd ? `$${call.estimatedCostUsd.toFixed(4)}` : "—"}</td>
                      <td className="py-2">
                        <Badge tone={call.status === "success" ? "success" : "error"}>{call.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
