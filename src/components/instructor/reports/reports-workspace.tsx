import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AiJobStatusPanel, type AiJobStatusItem } from "@/components/instructor/ai-job-status-panel";
import { useInstructorReports } from "@/hooks/use-instructor-reports";
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
  aiJobStatusItems: AiJobStatusItem[];
  currentQuestionTitle: string;
  sessionPrivateVisibility: boolean;
  synthesisReleasedForQuestion: boolean;
  reportsReleasedForQuestion: boolean;
}

export function ReportsWorkspace({
  sessionSlug,
  selectedQuestionId,
  categories,
  aiJobStatusItems,
  currentQuestionTitle,
  sessionPrivateVisibility,
  synthesisReleasedForQuestion,
  reportsReleasedForQuestion,
}: ReportsWorkspaceProps) {
  const reports = useInstructorReports(sessionSlug, selectedQuestionId);
  const questionScopedArgs = selectedQuestionId
    ? { sessionSlug, questionId: selectedQuestionId }
    : { sessionSlug };
  const semanticStatus = useQuery(api.semantic.getSemanticStatus, questionScopedArgs);
  const noveltyRadar = useQuery(api.semantic.getNoveltyRadar, questionScopedArgs);
  const categoryDrift = useQuery(api.semantic.getCategoryDrift, questionScopedArgs);
  const argumentGraph = useQuery(api.argumentMap.getVisualizationGraph, questionScopedArgs);

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

      <section className="grid gap-5 lg:grid-cols-2">
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
      </section>
    </div>
  );
}
