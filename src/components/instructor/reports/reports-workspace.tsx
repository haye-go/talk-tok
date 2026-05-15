import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AiJobStatusPanel, type AiJobStatusItem } from "@/components/instructor/ai-job-status-panel";
import { useInstructorReports } from "@/hooks/use-instructor-reports";
import { useInstructorPreviewAuth } from "@/hooks/use-instructor-preview-auth";
import { ArgumentMapSection } from "./argument-map-section";
import { CategoryDriftSection } from "./category-drift-section";
import { EmbeddingsStatusSection } from "./embeddings-status-section";
import { NoveltyRadarSection } from "./novelty-radar-section";
import { NoveltySignalsSection } from "./novelty-signals-section";
import { PersonalReportsMasterDetailPanel } from "./personal-reports-master-detail-panel";
import { SynthesisMasterDetailPanel } from "./synthesis-master-detail-panel";

interface CategoryRef {
  id: Id<"categories">;
  name: string;
}

export interface ReportsWorkspaceProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
  categories: CategoryRef[];
  currentQuestionTitle: string;
  sessionPrivateVisibility: boolean;
  synthesisReleasedForQuestion: boolean;
  reportsReleasedForQuestion: boolean;
}

function isBusyStatus(status?: string) {
  return status === "queued" || status === "processing";
}

function jobTone(
  job?: { status: string } | null,
  fallback: AiJobStatusItem["tone"] = "neutral",
): AiJobStatusItem["tone"] {
  if (!job) return fallback;
  if (job.status === "error") return "error";
  if (isBusyStatus(job.status)) return "warning";
  return "success";
}

export function ReportsWorkspace({
  sessionSlug,
  selectedQuestionId,
  categories,
  currentQuestionTitle,
  sessionPrivateVisibility,
  synthesisReleasedForQuestion,
  reportsReleasedForQuestion,
}: ReportsWorkspaceProps) {
  const { previewPassword } = useInstructorPreviewAuth();
  const reports = useInstructorReports(sessionSlug, selectedQuestionId);
  const questionScopedArgs = selectedQuestionId
    ? { sessionSlug, questionId: selectedQuestionId, previewPassword: previewPassword ?? "" }
    : { sessionSlug, previewPassword: previewPassword ?? "" };
  const semanticStatus = useQuery(
    api.semantic.getSemanticStatus,
    previewPassword ? questionScopedArgs : "skip",
  );
  const noveltyRadar = useQuery(
    api.semantic.getNoveltyRadar,
    previewPassword ? questionScopedArgs : "skip",
  );
  const categoryDrift = useQuery(
    api.semantic.getCategoryDrift,
    previewPassword ? questionScopedArgs : "skip",
  );
  const argumentGraph = useQuery(
    api.argumentMap.getVisualizationGraph,
    previewPassword ? questionScopedArgs : "skip",
  );

  if (!reports) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-5 p-5 lg:p-7">
        <p className="text-sm text-[var(--c-muted)]">Loading review data…</p>
      </div>
    );
  }

  const synthesisArtifacts = reports.synthesis.artifacts;
  const personalReports = reports.personalReports.items;
  const personalReportCounts = reports.personalReports.counts;

  const embeddingCount = reports.semantic.embeddingsCount;
  const signalCount = reports.semantic.signalsCount;
  const argumentLinkCount = reports.semantic.argumentLinkCount;
  const hasEmbeddings = embeddingCount > 0;
  const hasNoveltySignals = signalCount > 0;
  const hasArgumentLinks = argumentLinkCount > 0;

  const latestArgumentMapJob = reports.jobs.all.find((job) => job.type === "argument_map") ?? null;
  const latestCategorisationJob = reports.jobs.all.find((job) => job.type === "categorisation") ?? null;
  const latestSynthesisJob = reports.jobs.all.find((job) => job.type === "synthesis") ?? null;
  const latestReportJob = reports.jobs.all.find((job) => job.type === "personal_report") ?? null;
  const latestBaselineJob = reports.jobs.all.find((job) => job.type === "question_baseline") ?? null;

  const synthesisCounts = reports.synthesis.counts;

  const aiJobStatusItems: AiJobStatusItem[] = [
    {
      label: "Categorisation",
      status: latestCategorisationJob?.status ?? "idle",
      detail: latestCategorisationJob ? `Last ${latestCategorisationJob.status}` : "No categorisation runs yet",
      tone: jobTone(latestCategorisationJob),
      error: latestCategorisationJob?.error,
      updatedAt: latestCategorisationJob?.updatedAt,
    },
    {
      label: "Synthesis",
      status: latestSynthesisJob?.status ?? "idle",
      detail: `${synthesisCounts.draft ?? 0} draft, ${synthesisCounts.published ?? 0} published, ${synthesisCounts.final ?? 0} final`,
      tone: jobTone(
        latestSynthesisJob,
        synthesisCounts.draft || synthesisCounts.published || synthesisCounts.final
          ? "sky"
          : "neutral",
      ),
      error: latestSynthesisJob?.error,
      updatedAt: latestSynthesisJob?.updatedAt,
    },
    {
      label: "Personal reports",
      status: latestReportJob?.status ?? "idle",
      detail: `${personalReportCounts.success ?? 0} ready, ${
        (personalReportCounts.queued ?? 0) + (personalReportCounts.processing ?? 0)
      } in flight`,
      tone: jobTone(latestReportJob, isBusyStatus(latestReportJob?.status) ? "warning" : "sky"),
      error: latestReportJob?.error,
      updatedAt: latestReportJob?.updatedAt,
    },
    {
      label: "Question baseline",
      status: latestBaselineJob?.status ?? "idle",
      detail: latestBaselineJob ? `Last ${latestBaselineJob.status}` : "No baseline generated yet",
      tone: jobTone(latestBaselineJob),
      error: latestBaselineJob?.error,
      updatedAt: latestBaselineJob?.updatedAt,
    },
    {
      label: "Embeddings and signals",
      status: hasEmbeddings ? "success" : "idle",
      detail: `${embeddingCount} embeddings, ${signalCount} signals`,
      tone: hasEmbeddings ? "success" : "neutral",
    },
    {
      label: "Argument map",
      status: latestArgumentMapJob?.status ?? "idle",
      detail: argumentGraph
        ? `${argumentGraph.nodes.length} nodes, ${argumentGraph.edges.length} edges`
        : "No argument graph generated yet",
      tone: jobTone(latestArgumentMapJob, argumentGraph ? "success" : "neutral"),
      error: latestArgumentMapJob?.error,
      updatedAt: latestArgumentMapJob?.updatedAt,
    },
  ];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 p-5 lg:p-7">
      <header className="border-b border-[#d7e0ea] pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">
          Reports / Review
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-[var(--c-ink)]">
          Review generated evidence and analysis
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--c-body)]">
          Reports owns synthesis, personal reports, semantic review, novelty, category drift, and
          the argument map. Live controls stay in the rail.
        </p>
      </header>

      <AiJobStatusPanel items={aiJobStatusItems} contextLabel={currentQuestionTitle} />

      <SynthesisMasterDetailPanel
        sessionSlug={sessionSlug}
        selectedQuestionId={selectedQuestionId}
        artifacts={synthesisArtifacts}
        categories={categories}
        synthesisReleasedForQuestion={synthesisReleasedForQuestion}
        sessionPrivateVisibility={sessionPrivateVisibility}
        counts={reports.synthesis.counts}
      />

      <PersonalReportsMasterDetailPanel
        sessionSlug={sessionSlug}
        selectedQuestionId={selectedQuestionId}
        reports={personalReports}
        counts={personalReportCounts}
        reportsReleasedForQuestion={reportsReleasedForQuestion}
      />

      <ArgumentMapSection
        sessionSlug={sessionSlug}
        selectedQuestionId={selectedQuestionId}
        linkCount={argumentLinkCount}
        ready={hasArgumentLinks}
        errorMessage={latestArgumentMapJob?.error ?? undefined}
        graph={argumentGraph ?? null}
      />

      <NoveltyRadarSection
        radar={
          semanticStatus?.readiness.canShowNoveltyRadar && noveltyRadar ? noveltyRadar : null
        }
      />

      <CategoryDriftSection drift={categoryDrift ?? null} />

      <EmbeddingsStatusSection
        sessionSlug={sessionSlug}
        selectedQuestionId={selectedQuestionId}
        embeddingCount={embeddingCount}
        submissionCount={semanticStatus?.submissionCount ?? 0}
      />
      <NoveltySignalsSection
        sessionSlug={sessionSlug}
        selectedQuestionId={selectedQuestionId}
        signalCount={signalCount}
        ready={hasNoveltySignals}
        hasEmbeddings={hasEmbeddings}
      />
    </div>
  );
}
