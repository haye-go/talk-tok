import { useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { useLocation, useParams } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { type AiJobStatusItem } from "@/components/instructor/ai-job-status-panel";
import { InstructorLeftRail, ROOM_MODES } from "@/components/instructor/instructor-left-rail";
import { InstructorRightRail } from "@/components/instructor/instructor-right-rail";
import { ReportsWorkspace } from "@/components/instructor/reports/reports-workspace";
import { SetupWorkspace } from "@/components/instructor/setup/setup-workspace";
import { InstructorShell } from "@/components/layout/instructor-shell";
import {
  type SessionSettingsUpdate,
  type VisibilityMode,
} from "@/components/instructor/session-controls-card";
import { PresenceBar } from "@/components/stream/presence-bar";
import { SubmissionCard } from "@/components/submission/submission-card";
import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { useInstructorOverview } from "@/hooks/use-instructor-overview";
import { useInstructorRoom } from "@/hooks/use-instructor-room";
import { categoryColorToTone } from "@/lib/category-colors";
import {
  routes,
  type InstructorRoomModeId,
  type InstructorWorkspaceTabId,
} from "@/lib/routes";
import { cn } from "@/lib/utils";

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
  const instructorRoom = useInstructorRoom(sessionSlug, activeQuestionId);
  const questionScopedArgs = activeQuestionId ? { sessionSlug, questionId: activeQuestionId } : { sessionSlug };
  const triggerCategorisation = useMutation(api.categorisation.triggerForSession);
  const updateVisibility = useMutation(api.instructorControls.updateVisibility);
  const updateSettings = useMutation(api.instructorControls.updateSettings);
  const generateCategorySummary = useMutation(api.synthesis.generateCategorySummary);
  const createCategory = useMutation(api.categoryManagement.create);
  const updateCategory = useMutation(api.categoryManagement.update);
  const createFollowUp = useMutation(api.followUps.create);
  const pendingRecatRequests = useQuery(api.recategorisation.listForSession, {
    sessionSlug,
    status: "pending",
  });
  const decideRecategorisation = useMutation(api.recategorisation.decide);

  const semanticStatus = useQuery(api.semantic.getSemanticStatus, questionScopedArgs);
  const similarityMap = useQuery(api.semantic.getSimilarityMap, questionScopedArgs);
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

  const queueEmbeddings = useMutation(api.semantic.queueEmbeddingsForSession);
  const checkOpenAiKey = useAction(api.modelSettings.checkOpenAiKey);

  const [triggeringCategorisation, setTriggeringCategorisation] = useState(false);
  const [generatingCategoryId, setGeneratingCategoryId] = useState<Id<"categories"> | null>(null);
  const [embeddingQueued, setEmbeddingQueued] = useState(false);
  const [openAiKeyState, setOpenAiKeyState] = useState<"checking" | "ready" | "missing" | "error">(
    "checking",
  );
  const [decidingRecatId, setDecidingRecatId] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [addCategoryName, setAddCategoryName] = useState("");
  const [addCategoryDescription, setAddCategoryDescription] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<Id<"categories"> | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryDescription, setEditingCategoryDescription] = useState("");
  const [followUpCategoryId, setFollowUpCategoryId] = useState<Id<"categories"> | null>(null);
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

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
  const categoryById = new Map(activeCategories.map((category) => [category.id, category]));
  const roomLatestThreads = instructorRoom?.latestThreads ?? [];
  const roomCategoryGroups =
    instructorRoom?.threadsByCategory.filter((group) => group.threads.length > 0) ?? [];
  const roomUncategorizedThreads = instructorRoom?.uncategorizedThreads ?? [];
  const roomNeedsAttention = instructorRoom?.needsAttention;
  const roomDataLoading = instructorRoom === undefined;

  async function handleVisibilityChange(visibilityMode: VisibilityMode) {
    await updateVisibility({ sessionSlug, visibilityMode });
  }

  async function handleSettingsSave(settings: SessionSettingsUpdate) {
    await updateSettings({
      sessionSlug,
      ...settings,
    });
  }

  async function handleRecategorisationDecision(args: {
    requestId: Id<"recategorizationRequests">;
    decision: "approved" | "rejected";
    categoryId?: Id<"categories">;
  }) {
    setDecidingRecatId(args.requestId);
    try {
      await decideRecategorisation({
        sessionSlug,
        requestId: args.requestId,
        decision: args.decision,
        categoryId: args.categoryId,
      });
    } finally {
      setDecidingRecatId(null);
    }
  }

  async function handleGenerateCategorySummary(categoryId: Id<"categories">) {
    setGeneratingCategoryId(categoryId);
    try {
      await generateCategorySummary({ sessionSlug, categoryId });
    } finally {
      setGeneratingCategoryId(null);
    }
  }

  async function handleTriggerCategorisation() {
    setTriggeringCategorisation(true);
    try {
      await triggerCategorisation({ sessionSlug, questionId: activeQuestionId });
    } finally {
      setTriggeringCategorisation(false);
    }
  }

  async function handleCreateCategory() {
    setCategoryError(null);
    setSavingCategory(true);
    try {
      await createCategory({
        sessionSlug,
        questionId: activeQuestionId,
        name: addCategoryName,
        description: addCategoryDescription || undefined,
      });
      setAddCategoryName("");
      setAddCategoryDescription("");
      setShowAddCategory(false);
    } catch (cause) {
      setCategoryError(cause instanceof Error ? cause.message : "Could not create category.");
    } finally {
      setSavingCategory(false);
    }
  }

  function startRenameCategory(category: (typeof activeCategories)[number]) {
    setCategoryError(null);
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryDescription(category.description ?? "");
  }

  async function handleRenameCategory(categoryId: Id<"categories">) {
    setCategoryError(null);
    setSavingCategory(true);
    try {
      await updateCategory({
        sessionSlug,
        categoryId,
        name: editingCategoryName,
        description: editingCategoryDescription || undefined,
      });
      setEditingCategoryId(null);
      setEditingCategoryName("");
      setEditingCategoryDescription("");
    } catch (cause) {
      setCategoryError(cause instanceof Error ? cause.message : "Could not rename category.");
    } finally {
      setSavingCategory(false);
    }
  }

  function startCategoryFollowUp(category: (typeof activeCategories)[number]) {
    setFollowUpError(null);
    setFollowUpCategoryId(category.id);
    setFollowUpPrompt(
      `What is one strong counterpoint or extension to the "${category.name}" view?`,
    );
  }

  async function handleCreateCategoryFollowUp(categoryId: Id<"categories">) {
    setFollowUpError(null);
    setSavingFollowUp(true);
    try {
      await createFollowUp({
        sessionSlug,
        questionId: activeQuestionId,
        title: `Follow-up: ${activeCategories.find((category) => category.id === categoryId)?.name ?? "Category"}`,
        prompt: followUpPrompt,
        targetMode: "categories",
        categoryIds: [categoryId],
        activateNow: true,
      });
      setFollowUpCategoryId(null);
      setFollowUpPrompt("");
    } catch (cause) {
      setFollowUpError(cause instanceof Error ? cause.message : "Could not create follow-up.");
    } finally {
      setSavingFollowUp(false);
    }
  }

  async function handleQueueEmbeddings() {
    setEmbeddingQueued(true);
    try {
      await queueEmbeddings({ sessionSlug, questionId: activeQuestionId });
    } finally {
      setEmbeddingQueued(false);
    }
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
  const categorisationBusy =
    triggeringCategorisation || isBusyStatus(latestCategorisationJob?.status);
  const reportBusy = isBusyStatus(latestReportJob?.status);
  const baselineBusy =
    isBusyStatus(latestBaselineJob?.status) || isBusyStatus(questionBaseline?.status);
  const baselineCanGenerate = selectedQuestion?.status === "released";
  const embeddingBusy = embeddingQueued || isBusyStatus(latestEmbeddingJob?.status);
  const argMapBusy = isBusyStatus(latestArgumentMapJob?.status);
  const embeddingCount = semanticStatus?.embeddingCount ?? 0;
  const noveltyCount = semanticStatus?.noveltyCount ?? 0;
  const hasEmbeddings = embeddingCount > 0;
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
      status: latestEmbeddingJob?.status ?? (embeddingQueued ? "queued" : "idle"),
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

  function renderRoomThread(thread: (typeof roomLatestThreads)[number]) {
    const { root, replies, assignment } = thread;
    const submission = root.submission;
    return (
      <div
        key={submission.id}
        className="rounded-[18px] border border-[#d7e0ea] bg-white"
      >
        <SubmissionCard submission={submission} />
        <div className="border-t border-[#e7edf3] px-4 py-3 text-xs text-[var(--c-muted)]">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={assignment ? "neutral" : "warning"}>
              {assignment?.categoryName ?? "Uncategorized"}
            </Badge>
            <span>{root.stats.upvoteCount} upvotes</span>
            <span>{root.stats.replyCount} replies</span>
            <span>
              {new Date(submission.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {replies.length > 0 ? (
            <details className="mt-3">
              <summary className="cursor-pointer font-medium text-[var(--c-ink)]">
                Show replies
              </summary>
              <div className="mt-3 grid gap-2">
                {replies.map((reply) => (
                  <div
                    key={reply.submission.id}
                    className="ml-4 border-l-2 border-[#dbe5ee] pl-3"
                  >
                    <SubmissionCard submission={reply.submission} />
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </div>
    );
  }

  const needsAttentionCount =
    (roomNeedsAttention?.pendingRecategorisationCount ?? recategorisation.pendingCount) +
    (roomNeedsAttention?.uncategorizedCount ?? responses.uncategorized) +
    (latestCategorisationJob?.status === "error" ? 1 : 0) +
    (latestSynthesisJob?.status === "error" ? 1 : 0) +
    (latestReportJob?.status === "error" ? 1 : 0);

  const roomWorkspace = (
    <div className="mx-auto grid w-full max-w-5xl gap-5 p-5 lg:p-7">
      <header className="border-b border-[var(--c-hairline)] pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--c-muted)]">
              Room
            </p>
            <h1 className="font-display text-2xl font-semibold text-[var(--c-ink)]">
              {selectedQuestion?.title ?? "Live discussion"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--c-body)]">
              {selectedQuestion?.prompt ?? session.openingPrompt}
            </p>
          </div>
          <Badge tone={selectedQuestion?.isCurrent ? "success" : "neutral"}>
            {selectedQuestion?.isCurrent
              ? "Current question"
              : (selectedQuestion?.status ?? session.phase)}
          </Badge>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {ROOM_MODES.map((mode) => {
            const Icon = mode.icon;

            return (
              <a
                key={mode.id}
                href={roomModeHref(mode.id)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-2 rounded-sm border px-3 text-sm font-medium transition",
                  roomMode === mode.id
                    ? "border-[var(--c-primary)] bg-[var(--c-surface-strong)] text-[var(--c-ink)]"
                    : "border-[var(--c-hairline)] text-[var(--c-muted)] hover:bg-[var(--c-surface-soft)] hover:text-[var(--c-ink)]",
                )}
              >
                <Icon size={15} />
                {mode.label}
              </a>
            );
          })}
        </div>
      </header>

      <details
        open
        className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)]"
      >
        <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
          <span className="inline-flex items-center gap-2 font-display text-sm font-medium text-[var(--c-ink)]">
            <WarningCircle size={16} />
            Needs attention
          </span>
          <Badge tone={needsAttentionCount > 0 ? "warning" : "success"}>
            {needsAttentionCount}
          </Badge>
        </summary>
        <div className="grid gap-2 border-t border-[var(--c-hairline)] px-4 py-3 text-sm">
          {recategorisation.pendingCount > 0 ? (
            <p className="text-[var(--c-body)]">
              {recategorisation.pendingCount} recategorisation request
              {recategorisation.pendingCount === 1 ? "" : "s"} pending review.
            </p>
          ) : null}
          {(roomNeedsAttention?.uncategorizedCount ?? responses.uncategorized) > 0 ? (
            <p className="text-[var(--c-body)]">
              {roomNeedsAttention?.uncategorizedCount ?? responses.uncategorized} root thread
              {(roomNeedsAttention?.uncategorizedCount ?? responses.uncategorized) === 1
                ? ""
                : "s"}{" "}
              need categorisation.
            </p>
          ) : null}
          {latestCategorisationJob?.status === "error" ||
          latestSynthesisJob?.status === "error" ||
          latestReportJob?.status === "error" ? (
            <p className="text-[var(--c-error)]">One or more live AI jobs need review.</p>
          ) : null}
          {needsAttentionCount === 0 ? (
            <p className="text-[var(--c-muted)]">No live issues for the selected question.</p>
          ) : null}
        </div>
      </details>

      {pendingRecatRequests && pendingRecatRequests.length > 0 ? (
        <Card title="Recategorisation Requests">
          <div className="grid gap-2">
            {pendingRecatRequests.slice(0, 6).map((request) => {
              const requestedCategory = request.requestedCategoryId
                ? categoryById.get(request.requestedCategoryId)
                : null;
              const canApprove = Boolean(request.requestedCategoryId);
              const busy = decidingRecatId === request.id;

              return (
                <div
                  key={request.id}
                  className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-surface-strong)] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--c-ink)]">
                        {requestedCategory
                          ? `Move to ${requestedCategory.name}`
                          : `Suggested: ${request.suggestedCategoryName ?? "New category"}`}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--c-body)]">
                        {request.reason}
                      </p>
                    </div>
                    <Badge tone="warning">{request.status}</Badge>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void handleRecategorisationDecision({
                          requestId: request.id,
                          decision: "rejected",
                        })
                      }
                    >
                      Reject
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy || !canApprove}
                      onClick={() =>
                        void handleRecategorisationDecision({
                          requestId: request.id,
                          decision: "approved",
                          categoryId: request.requestedCategoryId ?? undefined,
                        })
                      }
                    >
                      {busy ? "Saving..." : "Approve"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <PresenceBar typing={presence.typing} />

      {roomMode === "latest" ? (
        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-medium text-[var(--c-ink)]">Latest threads</h2>
            <Badge tone="neutral">{roomLatestThreads.length}</Badge>
          </div>
          {roomDataLoading ? (
            <Card>
              <p className="text-sm text-[var(--c-muted)]">Loading room threads...</p>
            </Card>
          ) : roomLatestThreads.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--c-muted)]">No submissions yet.</p>
            </Card>
          ) : (
            roomLatestThreads.map(renderRoomThread)
          )}
        </section>
      ) : null}

      {roomMode === "categories" ? (
        <section className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-medium text-[var(--c-ink)]">By category</h2>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setCategoryError(null);
                setShowAddCategory((value) => !value);
              }}
            >
              + Add category
            </Button>
          </div>

          {showAddCategory ? (
            <form
              className="grid gap-2 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateCategory();
              }}
            >
              <input
                value={addCategoryName}
                onChange={(event) => setAddCategoryName(event.target.value)}
                placeholder="Category name"
                className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm text-[var(--c-ink)]"
              />
              <textarea
                value={addCategoryDescription}
                onChange={(event) => setAddCategoryDescription(event.target.value)}
                placeholder="Short description"
                rows={2}
                className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm text-[var(--c-ink)]"
              />
              {categoryError ? (
                <p className="text-xs text-[var(--c-error)]">{categoryError}</p>
              ) : null}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingCategory || addCategoryName.trim().length < 2}
                >
                  {savingCategory ? "Saving..." : "Create"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddCategory(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}

          {roomCategoryGroups.map(({ category, threads }, index) => (
            <section
              key={category.id}
              className="grid gap-3 border-l-4 pl-4"
              style={{ borderColor: `var(--c-sig-${categoryColorToTone(category.color, index)})` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-medium text-[var(--c-ink)]">
                    {category.name}
                  </h3>
                  {category.description ? (
                    <p className="text-xs text-[var(--c-muted)]">{category.description}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => startRenameCategory(category)}
                  >
                    Rename
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => startCategoryFollowUp(category)}
                  >
                    Follow-up
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleGenerateCategorySummary(category.id)}
                    disabled={generatingCategoryId === category.id}
                  >
                    {generatingCategoryId === category.id ? "Summarizing..." : "Summarize"}
                  </Button>
                </div>
              </div>

              {editingCategoryId === category.id ? (
                <form
                  className="grid gap-2 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleRenameCategory(category.id);
                  }}
                >
                  <input
                    value={editingCategoryName}
                    onChange={(event) => setEditingCategoryName(event.target.value)}
                    className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm text-[var(--c-ink)]"
                  />
                  <textarea
                    value={editingCategoryDescription}
                    onChange={(event) => setEditingCategoryDescription(event.target.value)}
                    rows={2}
                    className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm text-[var(--c-ink)]"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={savingCategory || editingCategoryName.trim().length < 2}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingCategoryId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : null}

              {followUpCategoryId === category.id ? (
                <form
                  className="grid gap-2 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleCreateCategoryFollowUp(category.id);
                  }}
                >
                  <textarea
                    value={followUpPrompt}
                    onChange={(event) => setFollowUpPrompt(event.target.value)}
                    rows={3}
                    placeholder="Follow-up question for this category"
                    className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm text-[var(--c-ink)]"
                  />
                  {followUpError ? (
                    <p className="text-xs text-[var(--c-error)]">{followUpError}</p>
                  ) : null}
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={savingFollowUp || followUpPrompt.trim().length < 5}
                    >
                      {savingFollowUp ? "Sending..." : "Send"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setFollowUpCategoryId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : null}

              {threads.map(renderRoomThread)}
            </section>
          ))}

          {roomUncategorizedThreads.length > 0 ? (
            <section className="grid gap-3 border-l-4 border-[var(--c-muted)] pl-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-base font-medium text-[var(--c-ink)]">
                  Uncategorized
                </h3>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleTriggerCategorisation()}
                  disabled={categorisationBusy}
                >
                  {categorisationBusy ? "Categorising..." : "Run categorisation"}
                </Button>
              </div>
              {roomUncategorizedThreads.map(renderRoomThread)}
            </section>
          ) : null}
        </section>
      ) : null}

      {roomMode === "similarity" ? (
        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-medium text-[var(--c-ink)]">
                Similarity map
              </h2>
              <p className="text-xs text-[var(--c-muted)]">
                Machine-generated idea proximity. Categories remain separate.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleQueueEmbeddings}
              disabled={embeddingBusy}
            >
              {embeddingBusy ? "Queued" : "Generate embeddings"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <MetricTile label="Embeddings" value={String(embeddingCount)} />
            <MetricTile label="Signals" value={String(noveltyCount)} />
            <MetricTile label="Clusters" value={String(similarityMap?.clusters.length ?? 0)} />
            <MetricTile
              label="Status"
              value={
                similarityMap === undefined
                  ? "loading"
                  : similarityMap?.clusters.length
                    ? "ready"
                    : hasEmbeddings
                      ? "unclustered"
                      : "pending"
              }
            />
          </div>

          {similarityMap === undefined ? (
            <Card>
              <p className="text-sm text-[var(--c-muted)]">Loading similarity clusters...</p>
            </Card>
          ) : null}

          {similarityMap && similarityMap.clusters.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--c-muted)]">
                No semantic clusters yet. New submissions are embedded asynchronously; existing
                messages can be processed with Generate embeddings.
              </p>
            </Card>
          ) : null}

          {similarityMap?.clusters.map((cluster, index) => (
            <section
              key={cluster.id}
              className="grid gap-3 border-l-4 pl-4"
              style={{
                borderColor: `var(--c-sig-${["sky", "peach", "mustard", "coral"][index % 4]})`,
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-medium text-[var(--c-ink)]">
                    {cluster.label}
                  </h3>
                  <p className="text-xs text-[var(--c-muted)]">
                    {cluster.rootSubmissionCount} roots / {cluster.messageCount} messages
                  </p>
                </div>
                <Badge tone={cluster.clusterKind === "promoted" ? "success" : "neutral"}>
                  {cluster.clusterKind}
                </Badge>
              </div>

              {cluster.threads.map((thread) => (
                <div
                  key={thread.root.id}
                  className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-display text-sm font-medium text-[var(--c-ink)]">
                      {thread.root.nickname}
                    </p>
                    <Badge tone="neutral">{thread.membership.score.toFixed(2)}</Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--c-body)]">
                    {thread.root.body}
                  </p>
                  {thread.replies.length > 0 ? (
                    <details className="mt-3 border-t border-[var(--c-hairline)] pt-3">
                      <summary className="cursor-pointer text-xs font-medium text-[var(--c-ink)]">
                        {thread.replies.length} replies
                      </summary>
                      <div className="mt-3 grid gap-2">
                        {thread.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className="border-l-2 border-[var(--c-hairline)] pl-3 text-sm"
                          >
                            <p className="font-medium text-[var(--c-ink)]">{reply.nickname}</p>
                            <p className="mt-1 whitespace-pre-wrap leading-6 text-[var(--c-body)]">
                              {reply.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              ))}
            </section>
          ))}
        </section>
      ) : null}
    </div>
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
