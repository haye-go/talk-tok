import { Export } from "@phosphor-icons/react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";

const MOCK_RECENT_CALLS = [
  { time: "12:04:32", feature: "Private Feedback", model: "sonnet-4-5", tokens: "820 / 340", latency: "1.2s", cost: "$0.008", status: "success" as const },
  { time: "12:04:28", feature: "Categorization", model: "sonnet-4-5", tokens: "1,200 / 180", latency: "0.9s", cost: "$0.006", status: "success" as const },
  { time: "12:04:15", feature: "Moderation", model: "haiku-4-5", tokens: "420 / 45", latency: "0.3s", cost: "$0.001", status: "success" as const },
  { time: "12:03:58", feature: "Fight Me", model: "sonnet-4-5", tokens: "1,800 / 520", latency: "2.1s", cost: "$0.013", status: "success" as const },
  { time: "12:03:41", feature: "Private Feedback", model: "sonnet-4-5", tokens: "780 / 0", latency: "4.8s", cost: "—", status: "error" as const },
  { time: "12:03:22", feature: "Overlap Detection", model: "haiku-4-5", tokens: "2,100 / 120", latency: "0.6s", cost: "$0.002", status: "success" as const },
];

const MOCK_BY_FEATURE = [
  { feature: "Private Feedback", calls: 24, cost: "$0.19", avgLatency: "1.4s" },
  { feature: "Categorization", calls: 18, cost: "$0.11", avgLatency: "0.8s" },
  { feature: "Fight Me", calls: 6, cost: "$0.08", avgLatency: "2.3s" },
  { feature: "Moderation", calls: 28, cost: "$0.03", avgLatency: "0.3s" },
  { feature: "Overlap Detection", calls: 4, cost: "$0.01", avgLatency: "0.5s" },
];

export function AdminObservabilityPage() {
  return (
    <AdminShell title="Observability" description="LLM usage, costs, latency, and error tracking.">
      <div className="grid gap-4">
        {/* Summary tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <MetricTile label="Total Calls" value="80" />
          <MetricTile label="Est. Cost" value="$0.42" />
          <MetricTile label="Total Tokens" value="48.2k" />
          <MetricTile label="Avg Latency" value="1.1s" />
          <MetricTile label="Errors" value="2" />
        </div>

        {/* By feature */}
        <Card title="Breakdown by Feature">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--c-hairline)] text-left text-[var(--c-muted)]">
                  <th className="py-2 pr-4 font-medium">Feature</th>
                  <th className="py-2 pr-4 font-medium">Calls</th>
                  <th className="py-2 pr-4 font-medium">Cost</th>
                  <th className="py-2 font-medium">Avg Latency</th>
                </tr>
              </thead>
              <tbody className="text-[var(--c-body)]">
                {MOCK_BY_FEATURE.map((row) => (
                  <tr key={row.feature} className="border-b border-[var(--c-hairline)]">
                    <td className="py-2 pr-4 font-medium">{row.feature}</td>
                    <td className="py-2 pr-4">{row.calls}</td>
                    <td className="py-2 pr-4">{row.cost}</td>
                    <td className="py-2">{row.avgLatency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent calls */}
        <Card
          title="Recent Calls"
          action={
            <Button size="sm" variant="ghost" icon={<Export size={14} />}>
              Export
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--c-hairline)] text-left text-[var(--c-muted)]">
                  <th className="py-2 pr-3 font-medium">Time</th>
                  <th className="py-2 pr-3 font-medium">Feature</th>
                  <th className="py-2 pr-3 font-medium">Model</th>
                  <th className="py-2 pr-3 font-medium">Tokens (in/out)</th>
                  <th className="py-2 pr-3 font-medium">Latency</th>
                  <th className="py-2 pr-3 font-medium">Cost</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-[var(--c-body)]">
                {MOCK_RECENT_CALLS.map((call, i) => (
                  <tr
                    key={i}
                    className="cursor-pointer border-b border-[var(--c-hairline)] transition-colors hover:bg-[var(--c-surface-soft)]"
                  >
                    <td className="py-2 pr-3 font-mono">{call.time}</td>
                    <td className="py-2 pr-3">{call.feature}</td>
                    <td className="py-2 pr-3">
                      <Badge tone="slate" className="text-[9px]">{call.model}</Badge>
                    </td>
                    <td className="py-2 pr-3 font-mono">{call.tokens}</td>
                    <td className="py-2 pr-3">{call.latency}</td>
                    <td className="py-2 pr-3">{call.cost}</td>
                    <td className="py-2">
                      <Badge tone={call.status === "success" ? "success" : "error"}>
                        {call.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
