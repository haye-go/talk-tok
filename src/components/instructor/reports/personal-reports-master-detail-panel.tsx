import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { cn } from "@/lib/utils";

interface PersonalReportItem {
  id: Id<"personalReports">;
  participantId: Id<"participants">;
  nickname: string;
  participantSlug: string;
  status: "queued" | "processing" | "success" | "error";
  participationBand?: string | null;
  reasoningBand?: string | null;
  originalityBand?: string | null;
  responsivenessBand?: string | null;
  summary?: string | null;
  contributionTrace?: string | null;
  argumentEvolution?: string | null;
  growthOpportunity?: string | null;
  submissionCount: number;
  followUpCount: number;
  fightCount: number;
  hasReportableActivity: boolean;
  error?: string | null;
  generatedAt?: number | null;
  updatedAt: number;
}

export interface PersonalReportsMasterDetailPanelProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
  reports: PersonalReportItem[];
  counts: {
    queued: number;
    processing: number;
    success: number;
    error: number;
    total: number;
  };
  reportsReleasedForQuestion: boolean;
}

function statusTone(status: PersonalReportItem["status"]) {
  switch (status) {
    case "success":
      return "success" as const;
    case "error":
      return "error" as const;
    case "queued":
    case "processing":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

function statusDot(status: PersonalReportItem["status"]) {
  switch (status) {
    case "success":
      return "bg-[var(--c-success)]";
    case "queued":
    case "processing":
      return "bg-[var(--c-warning)]";
    case "error":
      return "bg-[var(--c-error)]";
    default:
      return "bg-[var(--c-hairline)]";
  }
}

export function PersonalReportsMasterDetailPanel({
  sessionSlug,
  selectedQuestionId,
  reports,
  counts,
  reportsReleasedForQuestion,
}: PersonalReportsMasterDetailPanelProps) {
  const generateReports = useMutation(api.personalReports.generateForSession);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedReports = useMemo(
    () =>
      [...reports].sort((left, right) => {
        // success first, then in-flight, then errors, then idle/missing
        const order: Record<PersonalReportItem["status"], number> = {
          success: 0,
          processing: 1,
          queued: 2,
          error: 3,
        };
        const diff = (order[left.status] ?? 4) - (order[right.status] ?? 4);
        if (diff !== 0) return diff;
        return (right.generatedAt ?? right.updatedAt) - (left.generatedAt ?? left.updatedAt);
      }),
    [reports],
  );

  const [selectedId, setSelectedId] = useState<Id<"personalReports"> | null>(
    sortedReports[0]?.id ?? null,
  );
  const selected = selectedId
    ? (sortedReports.find((report) => report.id === selectedId) ?? sortedReports[0] ?? null)
    : (sortedReports[0] ?? null);

  async function handleGenerateAll() {
    if (!selectedQuestionId) return;
    setBusy(true);
    setError(null);
    try {
      await generateReports({ sessionSlug, questionId: selectedQuestionId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate reports.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Personal Reports">
      <p className="mb-3 text-xs leading-5 text-[var(--c-muted)]">
        Reports can be generated before they are released. Select a learner to preview their
        report.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Badge tone={reportsReleasedForQuestion ? "success" : "warning"}>
          {reportsReleasedForQuestion ? "Reports released" : "Reports hidden in Me"}
        </Badge>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
          <span>
            <strong className="text-[var(--c-ink)]">{counts.total}</strong>{" "}
            <span className="text-[var(--c-muted)]">total</span>
          </span>
          <span aria-hidden className="text-[var(--c-muted)]">·</span>
          <span>
            <strong className="text-[var(--c-ink)]">{counts.success}</strong>{" "}
            <span className="text-[var(--c-muted)]">success</span>
          </span>
          <span aria-hidden className="text-[var(--c-muted)]">·</span>
          <span>
            <strong
              className={
                counts.queued + counts.processing > 0
                  ? "text-[var(--c-warning)]"
                  : "text-[var(--c-ink)]"
              }
            >
              {counts.queued + counts.processing}
            </strong>{" "}
            <span className="text-[var(--c-muted)]">processing</span>
          </span>
          <span aria-hidden className="text-[var(--c-muted)]">·</span>
          <span>
            <strong
              className={counts.error > 0 ? "text-[var(--c-error)]" : "text-[var(--c-ink)]"}
            >
              {counts.error}
            </strong>{" "}
            <span className="text-[var(--c-muted)]">error</span>
          </span>
        </div>
        <Button
          size="sm"
          variant="coral"
          onClick={() => void handleGenerateAll()}
          disabled={busy || !selectedQuestionId}
          className="ml-auto"
        >
          {busy ? "Generating..." : "Generate All Reports"}
        </Button>
      </div>
      {error ? <p className="mb-3 text-xs text-[var(--c-error)]">{error}</p> : null}

      <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-[var(--c-hairline)] md:grid-cols-[200px_minmax(0,1fr)] md:min-h-[300px]">
        {/* Master list */}
        <ul className="flex flex-col border-b border-[var(--c-hairline)] bg-[var(--c-surface-soft)] md:border-b-0 md:border-r">
          <li className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--c-muted)]">
            Learners
          </li>
          {sortedReports.length === 0 ? (
            <li className="px-3 py-3 text-xs text-[var(--c-muted)]">
              No personal reports generated yet.
            </li>
          ) : (
            sortedReports.map((report) => (
              <li key={report.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(report.id)}
                  className={cn(
                    "flex w-full items-center gap-2 border-t border-[var(--c-hairline)] px-3 py-2 text-left text-xs transition",
                    selected?.id === report.id
                      ? "bg-white font-semibold text-[var(--c-ink)]"
                      : "text-[var(--c-body)] hover:bg-white/70",
                  )}
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", statusDot(report.status))} />
                  <span className="flex-1 truncate">{report.nickname}</span>
                </button>
              </li>
            ))
          )}
        </ul>

        {/* Detail pane */}
        <div className="max-h-[380px] overflow-y-auto bg-white p-4">
          {selected ? (
            <div>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--c-muted)]">
                    Learner
                  </p>
                  <h4 className="font-display text-base font-semibold text-[var(--c-ink)]">
                    {selected.nickname}
                  </h4>
                </div>
                <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
              </div>

              <div className="mb-3 grid grid-cols-3 gap-2">
                <MetricTile label="Responses" value={String(selected.submissionCount)} />
                <MetricTile label="Follow-ups" value={String(selected.followUpCount)} />
                <MetricTile label="Fights" value={String(selected.fightCount)} />
              </div>

              {selected.summary ? (
                <p className="mb-3 whitespace-pre-wrap text-sm leading-6 text-[var(--c-body)]">
                  {selected.summary}
                </p>
              ) : (
                <p className="mb-3 text-sm italic text-[var(--c-muted)]">
                  {selected.status === "processing" || selected.status === "queued"
                    ? "Report generation in progress."
                    : selected.hasReportableActivity
                      ? "Summary not generated yet."
                      : "Learner has no reportable activity yet."}
                </p>
              )}

              {selected.contributionTrace ? (
                <DetailBlock label="Contribution Trace" body={selected.contributionTrace} />
              ) : null}
              {selected.argumentEvolution ? (
                <DetailBlock label="Argument Evolution" body={selected.argumentEvolution} />
              ) : null}
              {selected.growthOpportunity ? (
                <DetailBlock label="Growth Opportunity" body={selected.growthOpportunity} />
              ) : null}

              {(selected.participationBand ||
                selected.reasoningBand ||
                selected.originalityBand ||
                selected.responsivenessBand) ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selected.participationBand ? (
                    <Badge tone="sky">Participation: {selected.participationBand}</Badge>
                  ) : null}
                  {selected.reasoningBand ? (
                    <Badge tone="sky">Reasoning: {selected.reasoningBand}</Badge>
                  ) : null}
                  {selected.originalityBand ? (
                    <Badge tone="mustard">Originality: {selected.originalityBand}</Badge>
                  ) : null}
                  {selected.responsivenessBand ? (
                    <Badge tone="sky">Responsiveness: {selected.responsivenessBand}</Badge>
                  ) : null}
                </div>
              ) : null}

              {selected.status === "error" && selected.error ? (
                <p className="mt-3 text-xs text-[var(--c-error)]">Error: {selected.error}</p>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-8 text-center">
              <p className="text-sm font-semibold text-[var(--c-muted)]">No reports yet.</p>
              <p className="mt-1 text-xs text-[var(--c-muted)]">
                Use Generate All Reports to start generation for this question.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

interface DetailBlockProps {
  label: string;
  body: string;
}

function DetailBlock({ label, body }: DetailBlockProps) {
  return (
    <div className="mt-3 rounded-lg border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--c-muted)]">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--c-body)]">{body}</p>
    </div>
  );
}
