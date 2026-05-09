import { useEffect, useState } from "react";
import { ChartBar, CircleNotch } from "@phosphor-icons/react";
import { useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ParticipantShell } from "@/components/layout/participant-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";
import { getOrCreateClientKey } from "@/lib/client-identity";

const PARTICIPATION_LABELS: Record<string, string> = {
  quiet: "Quiet",
  active: "Active",
  highly_active: "Highly Active",
};

const REASONING_LABELS: Record<string, string> = {
  emerging: "Emerging",
  solid: "Solid",
  strong: "Strong",
  exceptional: "Exceptional",
};

const ORIGINALITY_LABELS: Record<string, string> = {
  common: "Common",
  above_average: "Above Avg",
  distinctive: "Distinctive",
  novel: "Novel",
};

const RESPONSIVENESS_LABELS: Record<string, string> = {
  limited: "Limited",
  responsive: "Responsive",
  highly_responsive: "Highly Responsive",
};

export function ReviewPage() {
  const { sessionSlug } = useParams({ from: "/session/$sessionSlug/review" });
  const [clientKey, setClientKey] = useState<string | null>(null);

  useEffect(() => {
    setClientKey(getOrCreateClientKey());
  }, []);

  const report = useQuery(
    api.personalReports.getMine,
    clientKey ? { sessionSlug, clientKey } : "skip",
  );
  const generateReport = useMutation(api.personalReports.generateMine);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (!clientKey || generating) return;
    setGenerating(true);
    try {
      await generateReport({ sessionSlug, clientKey });
    } finally {
      setGenerating(false);
    }
  }

  if (report === undefined) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
        <LoadingState label="Loading your report..." className="w-full max-w-md" />
      </main>
    );
  }

  if (report === null) {
    return (
      <ParticipantShell
        myZone={
          <div className="grid place-items-center gap-4 py-8">
            <ChartBar size={32} className="text-[var(--c-success)]" />
            <p className="font-display text-sm font-medium text-[var(--c-ink)]">
              No report generated yet
            </p>
            <p className="text-xs text-[var(--c-muted)]">
              Generate your personal analysis to see how you contributed to the discussion.
            </p>
            <Button
              style={{ background: "var(--c-success)", color: "white" }}
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? "Requesting..." : "Generate My Report"}
            </Button>
          </div>
        }
      />
    );
  }

  if (report.status === "queued" || report.status === "processing") {
    return (
      <ParticipantShell
        myZone={
          <div className="grid place-items-center gap-3 py-8">
            <CircleNotch size={28} className="animate-spin text-[var(--c-success)]" />
            <p className="font-display text-sm font-medium text-[var(--c-ink)]">
              Generating your report...
            </p>
            <p className="text-xs text-[var(--c-muted)]">
              AI is analyzing your contributions. This usually takes a few seconds.
            </p>
          </div>
        }
      />
    );
  }

  if (report.status === "error") {
    return (
      <ParticipantShell
        myZone={
          <div className="grid gap-4">
            <ErrorState
              title="Report generation failed"
              description={report.error ?? "An error occurred while generating your report."}
            />
            <div className="text-center">
              <Button variant="secondary" onClick={handleGenerate} disabled={generating}>
                {generating ? "Requesting..." : "Retry"}
              </Button>
            </div>
          </div>
        }
      />
    );
  }

  return (
    <ParticipantShell
      myZone={
        <div className="grid gap-4">
          <div className="text-center">
            <ChartBar size={24} className="mx-auto mb-1 text-[var(--c-success)]" />
            <h2 className="font-display text-base font-medium text-[var(--c-ink)]">
              Your Personal Analysis
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <MetricTile
              label="Participation"
              value={PARTICIPATION_LABELS[report.participationBand ?? ""] ?? "—"}
            />
            <MetricTile
              label="Reasoning"
              value={REASONING_LABELS[report.reasoningBand ?? ""] ?? "—"}
            />
            <MetricTile
              label="Originality"
              value={ORIGINALITY_LABELS[report.originalityBand ?? ""] ?? "—"}
            />
            <MetricTile
              label="Responsiveness"
              value={RESPONSIVENESS_LABELS[report.responsivenessBand ?? ""] ?? "—"}
            />
          </div>

          {report.summary && (
            <Card title="Summary">
              <p className="text-xs leading-relaxed text-[var(--c-body)]">{report.summary}</p>
            </Card>
          )}

          {report.contributionTrace && (
            <Card title="Contribution Trace">
              <p className="text-xs leading-relaxed text-[var(--c-body)]">
                {report.contributionTrace}
              </p>
            </Card>
          )}

          {report.argumentEvolution && (
            <Card title="Argument Evolution">
              <p className="text-xs leading-relaxed text-[var(--c-body)]">
                {report.argumentEvolution}
              </p>
            </Card>
          )}

          {report.growthOpportunity && (
            <div className="rounded-md bg-[var(--c-sig-cream)] p-3.5">
              <p className="font-display text-xs font-semibold text-[var(--c-sig-mustard)]">
                Growth Opportunity
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--c-on-sig-light-body)]">
                {report.growthOpportunity}
              </p>
            </div>
          )}

          {report.generatedAt && (
            <p className="text-center text-[10px] text-[var(--c-muted)]">
              Generated {new Date(report.generatedAt).toLocaleString()}
            </p>
          )}

          <div className="text-center">
            <Button variant="ghost" onClick={handleGenerate} disabled={generating}>
              {generating ? "Requesting..." : "Regenerate Report"}
            </Button>
          </div>
        </div>
      }
    />
  );
}
