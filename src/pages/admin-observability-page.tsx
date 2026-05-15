import { useState } from "react";
import { CaretDown, CaretRight, Export } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MetricTile } from "@/components/ui/metric-tile";
import { LoadingState } from "@/components/state/loading-state";
import { useInstructorPreviewAuth } from "@/hooks/use-instructor-preview-auth";

interface CsvRow {
  [key: string]: string | number | boolean | null | undefined;
}

interface FeatureSummary {
  calls: number;
  estimatedCostUsd?: number;
  errors: number;
}

interface RecentCall {
  _id: string;
  createdAt: number;
  feature: string;
  provider?: string;
  model?: string;
  status: string;
  promptTemplateKey?: string;
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  estimatedCostUsd?: number;
  latencyMs?: number;
  error?: string;
}

function downloadCsv(rows: CsvRow[], filename: string) {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(","),
    ...rows.map((row) =>
      keys
        .map((k) => {
          const v = row[k];
          if (v == null) return "";
          const s = String(v);
          return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminObservabilityPage() {
  const { previewPassword } = useInstructorPreviewAuth();
  const [sessionFilter, setSessionFilter] = useState("");
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  const summaryArgs = previewPassword
    ? sessionFilter
      ? { sessionSlug: sessionFilter, previewPassword }
      : { previewPassword }
    : "skip";
  const callsArgs = previewPassword
    ? sessionFilter
      ? { sessionSlug: sessionFilter, limit: 50, previewPassword }
      : { limit: 50, previewPassword }
    : "skip";

  const summary = useQuery(api.llmObservability.summary, summaryArgs);
  const recentCalls = useQuery(api.llmObservability.recentCalls, callsArgs);

  function handleExport() {
    if (!recentCalls || recentCalls.length === 0) return;
    const rows = recentCalls.map((c: RecentCall) => ({
      time: new Date(c.createdAt).toISOString(),
      feature: c.feature,
      provider: c.provider ?? "",
      model: c.model ?? "",
      status: c.status,
      promptTemplateKey: c.promptTemplateKey ?? "",
      inputTokens: c.inputTokens ?? 0,
      cachedInputTokens: c.cachedInputTokens ?? 0,
      outputTokens: c.outputTokens ?? 0,
      reasoningTokens: c.reasoningTokens ?? 0,
      estimatedCostUsd: c.estimatedCostUsd ?? 0,
      latencyMs: c.latencyMs ?? "",
      error: c.error ?? "",
    }));
    downloadCsv(rows, `llm-calls-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <AdminShell title="Observability" description="LLM usage, costs, latency, and error tracking.">
      <div className="grid gap-4">
        {/* Session filter */}
        <div className="max-w-xs">
          <Input
            label="Filter by session slug (optional)"
            placeholder="e.g. useless-university-lessons-demo"
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
          />
        </div>

        {summary === undefined && <LoadingState label="Loading observability..." />}

        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <MetricTile label="Total Calls" value={String(summary.totalCalls)} />
            <MetricTile label="Est. Cost" value={`$${summary.totalEstimatedCostUsd.toFixed(2)}`} />
            <MetricTile label="Total Tokens" value={`${Math.round(summary.totalTokens / 1000)}k`} />
            <MetricTile
              label="Avg Latency"
              value={summary.averageLatencyMs ? `${Math.round(summary.averageLatencyMs)}ms` : "—"}
            />
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
                      <td className="py-2 pr-4">{(data as FeatureSummary).calls}</td>
                      <td className="py-2 pr-4">
                        ${((data as FeatureSummary).estimatedCostUsd ?? 0).toFixed(3)}
                      </td>
                      <td className="py-2">{(data as FeatureSummary).errors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Card
          title="Recent Calls"
          action={
            <Button size="sm" variant="ghost" icon={<Export size={14} />} onClick={handleExport}>
              Export
            </Button>
          }
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
                    <th className="py-2 pr-1 font-medium" />
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
                  {recentCalls.map((call: RecentCall) => {
                    const isExpanded = expandedCallId === call._id;
                    return (
                      <tr
                        key={call._id}
                        className="cursor-pointer border-b border-[var(--c-hairline)] transition-colors hover:bg-[var(--c-surface-soft)]"
                        onClick={() => setExpandedCallId(isExpanded ? null : call._id)}
                      >
                        <td className="py-2 pr-1 text-[var(--c-muted)]">
                          {isExpanded ? <CaretDown size={10} /> : <CaretRight size={10} />}
                        </td>
                        <td className="py-2 pr-3 font-mono">
                          {new Date(call.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-2 pr-3">{call.feature}</td>
                        <td className="py-2 pr-3">
                          <Badge tone="slate" className="text-[9px]">
                            {call.model}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 font-mono">
                          {call.inputTokens ?? 0}/{call.outputTokens ?? 0}
                        </td>
                        <td className="py-2 pr-3">
                          {call.latencyMs ? `${call.latencyMs}ms` : "—"}
                        </td>
                        <td className="py-2 pr-3">
                          {call.estimatedCostUsd ? `$${call.estimatedCostUsd.toFixed(4)}` : "—"}
                        </td>
                        <td className="py-2">
                          <Badge tone={call.status === "success" ? "success" : "error"}>
                            {call.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {expandedCallId &&
                (() => {
                  const call = recentCalls.find((c: RecentCall) => c._id === expandedCallId) ?? null;
                  if (!call) return null;
                  return (
                    <div className="border-t border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3">
                      <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
                        <div>
                          <span className="text-[var(--c-muted)]">Prompt Key:</span>{" "}
                          <span className="text-[var(--c-ink)]">
                            {call.promptTemplateKey ?? "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--c-muted)]">Cached Input:</span>{" "}
                          <span className="font-mono text-[var(--c-ink)]">
                            {call.cachedInputTokens ?? 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--c-muted)]">Reasoning:</span>{" "}
                          <span className="font-mono text-[var(--c-ink)]">
                            {call.reasoningTokens ?? 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--c-muted)]">Provider:</span>{" "}
                          <span className="text-[var(--c-ink)]">{call.provider ?? "—"}</span>
                        </div>
                      </div>
                      {call.error && (
                        <div className="mt-2 rounded-sm bg-[var(--c-canvas)] p-2">
                          <p className="text-[10px] font-medium text-[var(--c-error)]">Error:</p>
                          <pre className="mt-1 whitespace-pre-wrap font-mono text-[10px] text-[var(--c-body)]">
                            {call.error}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })()}
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
