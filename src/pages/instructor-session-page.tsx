import { useEffect, useState } from "react";
import { useLocation, useParams } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { type AiJobStatusItem } from "@/components/instructor/ai-job-status-panel";
import { InstructorLeftRail } from "@/components/instructor/instructor-left-rail";
import { InstructorRightRail } from "@/components/instructor/instructor-right-rail";
import { ReportsWorkspace } from "@/components/instructor/reports/reports-workspace";
import { RoomWorkspace } from "@/components/instructor/room/room-workspace";
import { SetupWorkspace } from "@/components/instructor/setup/setup-workspace";
import { InstructorShell } from "@/components/layout/instructor-shell";
import {
  type SessionSettingsUpdate,
  type VisibilityMode,
} from "@/components/instructor/session-controls-card";
import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";
import { useInstructorOverview } from "@/hooks/use-instructor-overview";
import {
  routes,
  type InstructorRoomModeId,
  type InstructorWorkspaceTabId,
} from "@/lib/routes";
import { type InputPattern } from "@/lib/submission-telemetry";

const AI_READINESS_FEATURES = [
  { feature: "feedback", label: "Feedback", promptKey: "feedback.private.v1" },
  { feature: "question_baseline", label: "Baseline", promptKey: "question.baseline.v1" },
  { feature: "categorisation", label: "Categorisation", promptKey: "categorisation.session.v1" },
  { feature: "synthesis", label: "Synthesis", promptKey: "synthesis.class.v1" },
  { feature: "personal_report", label: "Reports", promptKey: "report.personal.v1" },
  { feature: "argument_map", label: "Argument map", promptKey: "argument_map.session.v1" },
  { feature: "embedding", label: "Embeddings", promptKey: null },
] as const;


function isInstructorWorkspaceTab(value: string | null): value is InstructorWorkspaceTabId {
  return value === "room" || value === "setup" || value === "reports";
}

function isInstructorRoomMode(value: string | null): value is InstructorRoomModeId {
  return value === "latest" || value === "categories" || value === "similarity";
}

type JobStatus = "queued" | "processing" | "success" | "error";
type JobType =
  | "question_baseline"
  | "feedback"
  | "categorisation"
  | "moderation"
  | "synthesis"
  | "fight_challenge"
  | "fight_debrief"
  | "personal_report"
  | "argument_map";

interface AiJobRecord {
  id: Id<"aiJobs">;
  questionId?: Id<"sessionQuestions">;
  submissionId?: Id<"submissions">;
  type: JobType;
  status: JobStatus;
  requestedBy: "system" | "instructor" | "participant";
  progressTotal?: number;
  progressDone?: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

interface EmbeddingJobRecord {
  status: JobStatus;
  progressTotal?: number;
  progressDone?: number;
  error?: string;
  updatedAt: number;
}

function isBusyStatus(status?: string) {
  return status === "queued" || status === "processing";
}

function jobTone(job?: { status: string } | null, fallback: AiJobStatusItem["tone"] = "neutral") {
  if (!job) return fallback;
  if (job.status === "error") return "error";
  if (isBusyStatus(job.status)) return "warning";
  return "success";
}

function progressDetail(job?: { status: string; progressDone?: number; progressTotal?: number } | null) {
  if (!job) return null;

  if (typeof job.progressDone === "number") {
    return `${job.progressDone}/${job.progressTotal ?? "?"} complete`;
  }

  return `Last ${job.status}`;
}

interface PersonalReportsSummary {
  total?: number;
  success?: number;
  queued?: number;
  processing?: number;
  error?: number;
}

export function InstructorSessionPage() {
  const { sessionSlug } = useParams({ from: "/instructor/session/$sessionSlug" });
  const location = useLocation();
  const searchParams = new URLSearchParams(location.searchStr);
  const requestedWorkspaceTab = searchParams.get("tab");
  const requestedRoomMode = searchParams.get("mode");
  const workspaceTab: InstructorWorkspaceTabId = isInstructorWorkspaceTab(requestedWorkspaceTab)
    ? requestedWorkspaceTab
    : "room";
  const roomMode: InstructorRoomModeId = isInstructorRoomMode(requestedRoomMode)
    ? requestedRoomMode
    : "latest";
  const selectedQuestionId = (searchParams.get("questionId") as Id<"sessionQuestions"> | null) ?? undefined;
  const overview = useInstructorOverview(sessionSlug, selectedQuestionId);
  const activeQuestionId = overview?.selectedQuestion?.id ?? overview?.currentQuestion?.id;
  const questionScopedArgs = activeQuestionId ? { sessionSlug, questionId: activeQuestionId } : { sessionSlug };
  const updateVisibility = useMutation(api.instructorControls.updateVisibility);
  const updateSettings = useMutation(api.instructorControls.updateSettings);
  const semanticStatus = useQuery(api.semantic.getSemanticStatus, questionScopedArgs);
  const argumentGraph = useQuery(api.argumentMap.getVisualizationGraph, questionScopedArgs);
  const aiJobs = useQuery(api.jobs.listForSession, { ...questionScopedArgs, limit: 80 });
  const questionBaseline = useQuery(api.questionBaselines.getForQuestion, questionScopedArgs);
  const modelSettings = useQuery(api.modelSettings.list);
  const promptTemplates = useQuery(api.promptTemplates.list);
  const sessionBudget = useQuery(
    api.budget.getSessionSpend,
    overview?.session.id ? { sessionId: overview.session.id } : "skip",
  );
  const recentLlmCalls = useQuery(api.llmObservability.recentCalls, { sessionSlug, limit: 12 });
  const demoToggles = useQuery(api.demo.listToggles, {});

  const checkOpenAiKey = useAction(api.modelSettings.checkOpenAiKey);

  const [openAiKeyState, setOpenAiKeyState] = useState<"checking" | "ready" | "missing" | "error">(
    "checking",
  );

  useEffect(() => {
    let cancelled = false;

    void checkOpenAiKey()
      .then((result) => {
        if (!cancelled) {
          setOpenAiKeyState(result.hasKey ? "ready" : "missing");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOpenAiKeyState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [checkOpenAiKey]);

  if (overview === undefined) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
        <LoadingState label="Loading instructor session..." className="w-full max-w-md" />
      </main>
    );
  }

  if (overview === null) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
        <ErrorState
          title="Session not found"
          description="This instructor session URL does not match an existing session."
        />
      </main>
    );
  }

  const {
    session,
    presence,
    responses,
    categories,
    recategorisation,
    followUps,
    synthesis,
    reports,
    selectedQuestion,
  } = overview;

  const joinPath = routes.join(session.joinCode);
  const joinUrl =
    typeof window === "undefined" ? joinPath : new URL(joinPath, window.location.origin).toString();

  const activeCategories = categories;
  const patternCounts = responses.inputPatterns as Record<InputPattern, number>;

  async function handleVisibilityChange(visibilityMode: VisibilityMode) {
    await updateVisibility({ sessionSlug, visibilityMode });
  }

  async function handleSettingsSave(settings: SessionSettingsUpdate) {
    await updateSettings({
      sessionSlug,
      ...settings,
    });
  }

  const artifactCounts = synthesis?.artifactCounts;
  const reportsSummary = reports?.summary as PersonalReportsSummary | undefined;
  const synthesisReleasedForQuestion = selectedQuestion?.synthesisVisible ?? false;
  const reportsReleasedForQuestion = selectedQuestion?.personalReportsVisible ?? false;
  const sessionPrivateVisibility = session.visibilityMode === "private_until_released";
  const jobRows = (aiJobs ?? overview.jobs.latest) as AiJobRecord[];
  const latestJobFor = (type: JobType) => jobRows.find((job) => job.type === type) ?? null;
  const latestCategorisationJob = latestJobFor("categorisation");
  const latestSynthesisJob = latestJobFor("synthesis");
  const latestReportJob = latestJobFor("personal_report");
  const latestBaselineJob = latestJobFor("question_baseline");
  const latestArgumentMapJob =
    (semanticStatus?.latestArgumentMapJob as AiJobRecord | null | undefined) ??
    latestJobFor("argument_map");
  const latestEmbeddingJob =
    (semanticStatus?.latestJob as EmbeddingJobRecord | null | undefined) ?? null;
  const categorisationBusy = isBusyStatus(latestCategorisationJob?.status);
  const reportBusy = isBusyStatus(latestReportJob?.status);
  const baselineBusy =
    isBusyStatus(latestBaselineJob?.status) || isBusyStatus(questionBaseline?.status);
  const baselineCanGenerate = selectedQuestion?.status === "released";
  const embeddingBusy = isBusyStatus(latestEmbeddingJob?.status);
  const argMapBusy = isBusyStatus(latestArgumentMapJob?.status);
  const enabledModelFeatures = new Set(
    (modelSettings ?? [])
      .filter((setting) => setting.enabled)
      .flatMap((setting) => setting.features ?? []),
  );
  const promptKeys = new Set((promptTemplates ?? []).map((template) => template.key));
  const missingModelFeatures = AI_READINESS_FEATURES.filter(
    (item) => !enabledModelFeatures.has(item.feature),
  );
  const missingPromptKeys = AI_READINESS_FEATURES.filter(
    (item) => item.promptKey && !promptKeys.has(item.promptKey),
  );
  const activeDemoToggles = (demoToggles ?? []).filter(
    (toggle) =>
      toggle.enabled &&
      ["simulateAiFailure", "simulateBudgetExceeded", "simulateSlowAi"].includes(toggle.key),
  );
  const recentLlmFailures = (recentLlmCalls ?? [])
    .filter((call) => call.status === "error")
    .slice(0, 3);
  const budgetUsagePercent =
    sessionBudget && sessionBudget.perSessionEstimatedCostUsd > 0
      ? Math.round(
          (sessionBudget.totalEstimatedCostUsd / sessionBudget.perSessionEstimatedCostUsd) * 100,
        )
      : 0;
  const budgetHardStopActive = sessionBudget
    ? Boolean(sessionBudget.hardStopEnabled) &&
      sessionBudget.totalEstimatedCostUsd >= sessionBudget.perSessionEstimatedCostUsd
    : false;
  const aiJobStatusItems: AiJobStatusItem[] = [
    {
      label: "Categorisation",
      status: latestCategorisationJob?.status ?? (responses.uncategorized > 0 ? "idle" : "ready"),
      detail:
        progressDetail(latestCategorisationJob) ??
        (responses.uncategorized > 0
          ? `${responses.uncategorized} uncategorized responses waiting`
          : "No uncategorized responses"),
      tone:
        latestCategorisationJob?.status === "error"
          ? "error"
          : categorisationBusy
            ? "warning"
            : responses.uncategorized > 0
              ? "neutral"
              : "success",
      error: latestCategorisationJob?.error,
      updatedAt: latestCategorisationJob?.updatedAt,
    },
    {
      label: "Synthesis",
      status: latestSynthesisJob?.status ?? "idle",
      detail:
        progressDetail(latestSynthesisJob) ??
        (artifactCounts
          ? `${artifactCounts.draft ?? 0} draft, ${artifactCounts.published ?? 0} published, ${artifactCounts.final ?? 0} final`
          : "No synthesis artifacts generated yet"),
      tone: jobTone(
        latestSynthesisJob,
        artifactCounts?.draft || artifactCounts?.published || artifactCounts?.final
          ? "sky"
          : "neutral",
      ),
      error: latestSynthesisJob?.error,
      updatedAt: latestSynthesisJob?.updatedAt,
    },
    {
      label: "Personal reports",
      status: latestReportJob?.status ?? "idle",
      detail:
        progressDetail(latestReportJob) ??
        (reportsSummary
          ? `${reportsSummary.success ?? 0} ready, ${(reportsSummary.queued ?? 0) + (reportsSummary.processing ?? 0)} in flight`
          : "No reports generated yet"),
      tone: jobTone(latestReportJob, reportBusy ? "warning" : "sky"),
      error: latestReportJob?.error,
      updatedAt: latestReportJob?.updatedAt,
    },
    {
      label: "Question baseline",
      status: latestBaselineJob?.status ?? questionBaseline?.status ?? "idle",
      detail:
        progressDetail(latestBaselineJob) ??
        (questionBaseline
          ? `${questionBaseline.status}${questionBaseline.model ? ` using ${questionBaseline.model}` : ""}`
          : "No baseline generated yet"),
      tone: jobTone(latestBaselineJob, questionBaseline?.status === "ready" ? "success" : "neutral"),
      error: latestBaselineJob?.error ?? questionBaseline?.error ?? undefined,
      updatedAt: latestBaselineJob?.updatedAt ?? questionBaseline?.updatedAt,
    },
    {
      label: "Embeddings and signals",
      status: latestEmbeddingJob?.status ?? "idle",
      detail:
        progressDetail(latestEmbeddingJob) ??
        (semanticStatus
          ? `${semanticStatus.embeddingCount} embeddings, ${semanticStatus.signalCount} signals`
          : "Semantic status not available yet"),
      tone: jobTone(
        latestEmbeddingJob,
        embeddingBusy ? "warning" : semanticStatus?.embeddingCount ? "success" : "neutral",
      ),
      error: latestEmbeddingJob?.error,
      updatedAt: latestEmbeddingJob?.updatedAt,
    },
    {
      label: "Argument map",
      status: latestArgumentMapJob?.status ?? "idle",
      detail:
        progressDetail(latestArgumentMapJob) ??
        (argumentGraph
          ? `${argumentGraph.nodes.length} nodes, ${argumentGraph.edges.length} edges`
          : "No argument graph generated yet"),
      tone: jobTone(
        latestArgumentMapJob,
        argMapBusy ? "warning" : argumentGraph ? "success" : "neutral",
      ),
      error: latestArgumentMapJob?.error,
      updatedAt: latestArgumentMapJob?.updatedAt,
    },
  ];

  const currentQuestionParam = selectedQuestion?.id;
  const workspaceHref = (tab: InstructorWorkspaceTabId) =>
    routes.instructorSessionWorkspace(session.slug, {
      tab,
      mode: tab === "room" ? roomMode : undefined,
      questionId: currentQuestionParam,
    });
  const roomModeHref = (mode: InstructorRoomModeId) =>
    routes.instructorSessionRoom(session.slug, {
      mode,
      questionId: currentQuestionParam,
    });
  const questionHref = (questionId: Id<"sessionQuestions">) =>
    routes.instructorSessionWorkspace(session.slug, {
      tab: workspaceTab,
      mode: workspaceTab === "room" ? roomMode : undefined,
      questionId,
    });

  const roomWorkspace = (
    <RoomWorkspace
      sessionSlug={sessionSlug}
      selectedQuestionId={selectedQuestion?.id}
      roomMode={roomMode}
      roomModeHref={roomModeHref}
      typingPresence={presence.typing}
      patternCounts={patternCounts}
      categories={activeCategories.map((category) => ({ id: category.id, name: category.name }))}
    />
  );

  const reportsWorkspace = (
    <ReportsWorkspace
      sessionSlug={sessionSlug}
      selectedQuestionId={selectedQuestion?.id}
      categories={activeCategories.map((category) => ({ id: category.id, name: category.name }))}
      aiJobStatusItems={aiJobStatusItems}
      currentQuestionTitle={overview.currentQuestion?.title ?? "the current question"}
      sessionPrivateVisibility={sessionPrivateVisibility}
      synthesisReleasedForQuestion={synthesisReleasedForQuestion}
      reportsReleasedForQuestion={reportsReleasedForQuestion}
    />
  );

  const setupWorkspace = (
    <SetupWorkspace
      sessionSlug={sessionSlug}
      selectedQuestionId={selectedQuestion?.id}
      session={session}
      currentQuestion={overview.currentQuestion}
      metrics={{
        submitted: responses.total,
        categories: activeCategories.length,
        recategorisationRequests: recategorisation.pendingCount,
        followUps: followUps.activeCount,
      }}
      onVisibilityChange={handleVisibilityChange}
      onSettingsSave={handleSettingsSave}
      joinUrl={joinUrl}
      categories={activeCategories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        color: category.color,
        assignmentCount: category.assignmentCount,
      }))}
      followUps={followUps.recent.map((prompt) => ({
        id: prompt.id,
        title: prompt.title,
        prompt: prompt.prompt,
        status: prompt.status,
        targetMode: prompt.targetMode,
        activatedAt: prompt.activatedAt ?? undefined,
        closedAt: prompt.closedAt ?? undefined,
        createdAt: prompt.createdAt,
      }))}
      aiReadiness={{
        baseline: questionBaseline
          ? {
              status: questionBaseline.status,
              provider: questionBaseline.provider ?? undefined,
              model: questionBaseline.model ?? undefined,
              generatedAt: questionBaseline.generatedAt ?? undefined,
            }
          : null,
        baselineBusy,
        baselineCanGenerate,
        openAiKeyState,
        modelsCount: modelSettings?.length ?? 0,
        promptsCount: promptTemplates?.length ?? 0,
        budgetUsagePercent,
        missingModelFeatureLabels: missingModelFeatures.map((item) => item.label),
        missingPromptKeys: missingPromptKeys.map((item) => item.promptKey).filter(Boolean) as string[],
        budgetHardStopActive,
        activeDemoToggleCount: activeDemoToggles.length,
        recentLlmFailures: recentLlmFailures.map((call) => ({
          id: call.id,
          feature: call.feature,
          error: call.error ?? undefined,
        })),
      }}
    />
  );

  return (
    <InstructorShell
      sessionTitle={session.title}
      sessionCode={session.joinCode}
      participantCount={session.participantCount}
      left={
        <InstructorLeftRail
          sessionTitle={session.title}
          workspaceTab={workspaceTab}
          roomMode={roomMode}
          workspaceHref={workspaceHref}
          roomModeHref={roomModeHref}
        />
      }
      center={
        workspaceTab === "room" ? (
          roomWorkspace
        ) : workspaceTab === "reports" ? (
          reportsWorkspace
        ) : (
          setupWorkspace
        )
      }
      right={
        <InstructorRightRail
          sessionSlug={session.slug}
          selectedQuestionId={selectedQuestion?.id}
          questionHref={questionHref}
        />
      }
    />
  );
}
