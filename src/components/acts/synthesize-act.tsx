import { useState } from "react";
import { ChartBar, CircleNotch, Sparkle } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SynthesisArtifactCard } from "@/components/synthesis/synthesis-artifact-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SynthesisArtifact {
  id: string;
  categoryId?: string;
  kind: string;
  status: string;
  title: string;
  summary?: string | null;
  keyPoints?: string[];
  uniqueInsights?: string[];
  opposingViews?: string[];
  generatedAt?: number | null;
  publishedAt?: number | null;
  finalizedAt?: number | null;
  updatedAt?: number;
}

interface PersonalReport {
  id: string;
  status: string;
  participationBand?: string | null;
  reasoningBand?: string | null;
  originalityBand?: string | null;
  responsivenessBand?: string | null;
  summary?: string | null;
  error?: string | null;
  generatedAt?: number | null;
}

interface SynthesizeActProps {
  publishedArtifacts?: SynthesisArtifact[];
  finalArtifacts?: SynthesisArtifact[];
  personalReport?: PersonalReport | null;
  sessionSlug: string;
  clientKey: string;
  onNavigateToReport?: () => void;
}

const BAND_LABELS: Record<string, string> = {
  quiet: "Quiet",
  active: "Active",
  highly_active: "Highly Active",
  emerging: "Emerging",
  solid: "Solid",
  strong: "Strong",
  exceptional: "Exceptional",
  common: "Common",
  above_average: "Above Avg",
  distinctive: "Distinctive",
  novel: "Novel",
  limited: "Limited",
  responsive: "Responsive",
  highly_responsive: "Highly Responsive",
};

export function SynthesizeAct({
  publishedArtifacts,
  finalArtifacts,
  personalReport,
  sessionSlug,
  clientKey,
  onNavigateToReport,
}: SynthesizeActProps) {
  const generateReport = useMutation(api.personalReports.generateMine);
  const [generatingReport, setGeneratingReport] = useState(false);

  const allArtifacts = [...(publishedArtifacts ?? []), ...(finalArtifacts ?? [])].sort(
    (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
  );

  const categorySummaries = allArtifacts.filter((a) => a.kind === "category_summary");
  const classArtifacts = allArtifacts.filter((a) => a.kind !== "category_summary");

  async function handleGenerateReport() {
    if (generatingReport) return;
    setGeneratingReport(true);
    try {
      await generateReport({ sessionSlug, clientKey });
    } finally {
      setGeneratingReport(false);
    }
  }

  const reportStatus = personalReport?.status;
  const reportIsGenerating = reportStatus === "queued" || reportStatus === "processing";

  return (
    <div className="space-y-3">
      <h2 className="font-display text-base font-medium text-[var(--c-ink)]">
        <Sparkle size={16} className="mr-1 inline" /> Class Synthesis
      </h2>

      {allArtifacts.length === 0 && (
        <div className="rounded-md bg-[var(--c-surface-soft)] p-4 text-center">
          <p className="text-sm text-[var(--c-muted)]">No class synthesis available yet.</p>
          <p className="mt-1 text-xs text-[var(--c-muted)]">
            The instructor will publish synthesis results when ready.
          </p>
        </div>
      )}

      {classArtifacts.map((artifact) => (
        <SynthesisArtifactCard key={artifact.id} artifact={artifact} sessionSlug={sessionSlug} />
      ))}

      {categorySummaries.length > 0 && (
        <>
          <h3 className="font-display text-sm font-medium text-[var(--c-ink)]">
            Category Summaries
          </h3>
          {categorySummaries.map((artifact) => (
            <SynthesisArtifactCard
              key={artifact.id}
              artifact={artifact}
              sessionSlug={sessionSlug}
            />
          ))}
        </>
      )}

      {/* Personal report CTA */}
      <div
        className="rounded-md border bg-[var(--c-surface-soft)] p-4 text-center"
        style={{ borderColor: "var(--c-success)" }}
      >
        <p className="font-display text-sm font-medium text-[var(--c-success)]">
          <ChartBar size={16} className="mr-1 inline" />
          Your Personal Analysis
        </p>

        {!personalReport && (
          <>
            <p className="mt-1 text-xs text-[var(--c-muted)]">
              See how your contributions shaped the discussion
            </p>
            <Button
              className="mt-3"
              style={{ background: "var(--c-success)", color: "white" }}
              onClick={handleGenerateReport}
              disabled={generatingReport}
            >
              {generatingReport ? "Requesting..." : "Generate My Report"}
            </Button>
          </>
        )}

        {reportIsGenerating && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <CircleNotch size={14} className="animate-spin text-[var(--c-success)]" />
            <span className="text-xs text-[var(--c-muted)]">Generating your report...</span>
          </div>
        )}

        {reportStatus === "success" && personalReport && (
          <div className="mt-2">
            <div className="flex flex-wrap justify-center gap-1.5">
              {personalReport.participationBand && (
                <Badge tone="sky" className="text-[9px]">
                  {BAND_LABELS[personalReport.participationBand] ??
                    personalReport.participationBand}
                </Badge>
              )}
              {personalReport.reasoningBand && (
                <Badge tone="peach" className="text-[9px]">
                  {BAND_LABELS[personalReport.reasoningBand] ?? personalReport.reasoningBand}
                </Badge>
              )}
              {personalReport.originalityBand && (
                <Badge tone="mustard" className="text-[9px]">
                  {BAND_LABELS[personalReport.originalityBand] ?? personalReport.originalityBand}
                </Badge>
              )}
            </div>
            {personalReport.summary && (
              <p className="mt-2 text-xs leading-relaxed text-[var(--c-body)]">
                {personalReport.summary.length > 150
                  ? `${personalReport.summary.slice(0, 150)}...`
                  : personalReport.summary}
              </p>
            )}
            {onNavigateToReport && (
              <Button variant="secondary" className="mt-3" onClick={onNavigateToReport}>
                View Full Report
              </Button>
            )}
          </div>
        )}

        {reportStatus === "error" && personalReport && (
          <div className="mt-2">
            <p className="text-xs text-[var(--c-error)]">
              {personalReport.error ?? "Report generation failed."}
            </p>
            <Button
              variant="secondary"
              className="mt-2"
              onClick={handleGenerateReport}
              disabled={generatingReport}
            >
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
