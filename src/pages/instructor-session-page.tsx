import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  BookOpen,
  ChartBar,
  CircleNotch,
  FloppyDisk,
  GearSix,
  Graph,
  ListBullets,
  Scales,
  Sparkle,
  SquaresFour,
  WarningCircle,
} from "@phosphor-icons/react";
import { useLocation, useParams } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AiJobStatusPanel, type AiJobStatusItem } from "@/components/instructor/ai-job-status-panel";
import { InstructorShell } from "@/components/layout/instructor-shell";
import { QuestionManagerPanel } from "@/components/instructor/question-manager-panel";
import {
  type SessionSettingsUpdate,
  type VisibilityMode,
} from "@/components/instructor/session-controls-card";
import { SynthesisArtifactCard } from "@/components/synthesis/synthesis-artifact-card";
import { PresenceBar } from "@/components/stream/presence-bar";
import { SubmissionCard } from "@/components/submission/submission-card";
import { ErrorState } from "@/components/state/error-state";
import { ArgumentMapGraph } from "@/components/instructor/argument-map-graph";
import { LoadingState } from "@/components/state/loading-state";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { useInstructorOverview } from "@/hooks/use-instructor-overview";
import { useInstructorRoom } from "@/hooks/use-instructor-room";
import { categoryColorToTone } from "@/lib/category-colors";
import { inputPatternLabel, type InputPattern } from "@/lib/submission-telemetry";
import {
  routes,
  type InstructorRoomModeId,
  type InstructorWorkspaceTabId,
} from "@/lib/routes";
import { cn } from "@/lib/utils";

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

const AI_READINESS_FEATURES = [
  { feature: "feedback", label: "Feedback", promptKey: "feedback.private.v1" },
  { feature: "question_baseline", label: "Baseline", promptKey: "question.baseline.v1" },
  { feature: "categorisation", label: "Categorisation", promptKey: "categorisation.session.v1" },
  { feature: "synthesis", label: "Synthesis", promptKey: "synthesis.class.v1" },
  { feature: "personal_report", label: "Reports", promptKey: "report.personal.v1" },
  { feature: "argument_map", label: "Argument map", promptKey: "argument_map.session.v1" },
  { feature: "embedding", label: "Embeddings", promptKey: null },
] as const;

const INSTRUCTOR_WORKSPACE_TABS: Array<{
  id: InstructorWorkspaceTabId;
  label: string;
  icon: typeof ListBullets;
}> = [
  { id: "room", label: "Room", icon: ListBullets },
  { id: "setup", label: "Setup", icon: GearSix },
  { id: "reports", label: "Reports", icon: ChartBar },
];

const ROOM_MODES: Array<{
  id: InstructorRoomModeId;
  label: string;
  icon: typeof ListBullets;
}> = [
  { id: "latest", label: "Latest", icon: ListBullets },
  { id: "categories", label: "Categories", icon: SquaresFour },
  { id: "similarity", label: "Similarity", icon: Graph },
];

function isInstructorWorkspaceTab(value: string | null): value is InstructorWorkspaceTabId {
  return value === "room" || value === "setup" || value === "reports";
}

function isInstructorRoomMode(value: string | null): value is InstructorRoomModeId {
  return value === "latest" || value === "categories" || value === "similarity";
}

function previewText(value?: string | null, maxLength = 150) {
  const text = value?.trim();

  if (!text) {
    return null;
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function formatReportTime(value?: number | null) {
  if (!value) {
    return "Not generated yet";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
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

interface NoveltyRadarItem {
  signalId: string;
  participantLabel: string;
  categoryName?: string;
  categoryColor?: string;
  band: string;
  bodyPreview?: string;
}

interface NoveltyRadarCategoryAverage {
  categoryId: string;
  categoryName: string;
  categoryColor?: string;
  averageNoveltyScore: number;
}

interface CategoryCountCell {
  categoryId: string;
  categoryName?: string;
  count: number;
}

interface CategoryDriftSlice {
  key: string;
  label: string;
  categoryCounts: CategoryCountCell[];
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
  const updatePhase = useMutation(api.instructorControls.updatePhase);
  const updateVisibility = useMutation(api.instructorControls.updateVisibility);
  const updateSettings = useMutation(api.instructorControls.updateSettings);
  const generateCategorySummary = useMutation(api.synthesis.generateCategorySummary);
  const generateClassSynthesis = useMutation(api.synthesis.generateClassSynthesis);
  const generateReports = useMutation(api.personalReports.generateForSession);
  const saveAsTemplate = useMutation(api.sessionTemplates.createFromSession);
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
  const noveltyRadar = useQuery(api.semantic.getNoveltyRadar, questionScopedArgs);
  const categoryDrift = useQuery(api.semantic.getCategoryDrift, questionScopedArgs);
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
  const refreshSignals = useMutation(api.semantic.refreshSignalsForSession);
  const generateArgMap = useMutation(api.argumentMap.generateForSession);
  const generateBaseline = useMutation(api.questionBaselines.generateForQuestion);
  const checkOpenAiKey = useAction(api.modelSettings.checkOpenAiKey);

  const [generatingClass, setGeneratingClass] = useState(false);
  const [generatingOpposing, setGeneratingOpposing] = useState(false);
  const [generatingReports, setGeneratingReports] = useState(false);
  const [reportGenerationError, setReportGenerationError] = useState<string | null>(null);
  const [triggeringCategorisation, setTriggeringCategorisation] = useState(false);
  const [categorisationMessage, setCategorisationMessage] = useState<string | null>(null);
  const [categorisationError, setCategorisationError] = useState<string | null>(null);
  const [generatingCategoryId, setGeneratingCategoryId] = useState<Id<"categories"> | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [embeddingQueued, setEmbeddingQueued] = useState(false);
  const [argMapQueued, setArgMapQueued] = useState(false);
  const [baselineGenerating, setBaselineGenerating] = useState(false);
  const [baselineError, setBaselineError] = useState<string | null>(null);
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
    questions,
    questionSummaries,
    presence,
    responses,
    categories,
    recategorisation,
    recentSubmissions,
    activity,
    followUps,
    synthesis,
    reports,
    selectedQuestion,
  } = overview;

  const joinPath = routes.join(session.joinCode);
  const joinUrl =
    typeof window === "undefined" ? joinPath : new URL(joinPath, window.location.origin).toString();

  const patternCounts = responses.inputPatterns as Record<InputPattern, number>;
  const activeCategories = categories;
  const categoryById = new Map(activeCategories.map((category) => [category.id, category]));
  const selectedQuestionSummary = questionSummaries.find(
    (summary) => summary.question.id === selectedQuestion?.id,
  );
  const roomSubmissions = selectedQuestion?.id
    ? recentSubmissions.filter((submission) => submission.questionId === selectedQuestion.id)
    : recentSubmissions;
  const repliesByParentId = new Map<Id<"submissions">, typeof recentSubmissions>();

  for (const submission of roomSubmissions) {
    if (!submission.parentSubmissionId) {
      continue;
    }

    const existing = repliesByParentId.get(submission.parentSubmissionId) ?? [];
    existing.push(submission);
    repliesByParentId.set(submission.parentSubmissionId, existing);
  }

  const roomRootThreads = roomSubmissions.filter((submission) => !submission.parentSubmissionId);
  const uncategorizedRoomThreads = roomRootThreads.filter((submission) => !submission.categoryId);
  const roomThreadsByCategory = activeCategories
    .map((category) => ({
      category,
      threads: roomRootThreads.filter((submission) => submission.categoryId === category.id),
    }))
    .filter((group) => group.threads.length > 0);
  const roomLatestThreads = instructorRoom?.latestThreads ?? [];
  const roomCategoryGroups =
    instructorRoom?.threadsByCategory.filter((group) => group.threads.length > 0) ?? [];
  const roomUncategorizedThreads = instructorRoom?.uncategorizedThreads ?? [];
  const roomNeedsAttention = instructorRoom?.needsAttention;
  const roomDataLoading = instructorRoom === undefined;

  const PHASE_ORDER = ["lobby", "submit", "discover", "challenge", "synthesize", "closed"] as const;
  type Phase = (typeof PHASE_ORDER)[number];
  type Act = "submit" | "discover" | "challenge" | "synthesize";
  const ACT_FOR_PHASE = {
    lobby: "submit",
    submit: "submit",
    discover: "discover",
    challenge: "challenge",
    synthesize: "synthesize",
    closed: "synthesize",
  } satisfies Record<Phase, Act>;

  function advancePhase() {
    const idx = PHASE_ORDER.indexOf(session.phase as Phase);
    const next = PHASE_ORDER[Math.min(idx + 1, PHASE_ORDER.length - 1)];
    void updatePhase({ sessionSlug, phase: next, currentAct: ACT_FOR_PHASE[next] });
  }

  function retreatPhase() {
    const idx = PHASE_ORDER.indexOf(session.phase as Phase);
    const prev = PHASE_ORDER[Math.max(idx - 1, 0)];
    void updatePhase({ sessionSlug, phase: prev, currentAct: ACT_FOR_PHASE[prev] });
  }

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

  async function handleGenerateClassSynthesis(kind?: "class_synthesis" | "opposing_views") {
    if (kind === "opposing_views") {
      setGeneratingOpposing(true);
      try {
        await generateClassSynthesis({
          sessionSlug,
          kind: "opposing_views",
          questionId: activeQuestionId,
        });
      } finally {
        setGeneratingOpposing(false);
      }
    } else {
      setGeneratingClass(true);
      try {
        await generateClassSynthesis({ sessionSlug, questionId: activeQuestionId });
      } finally {
        setGeneratingClass(false);
      }
    }
  }

  async function handleGenerateBaseline(forceRegenerate = false) {
    setBaselineError(null);
    setBaselineGenerating(true);
    try {
      await generateBaseline({
        sessionSlug,
        questionId: activeQuestionId,
        forceRegenerate,
      });
    } catch (cause) {
      setBaselineError(cause instanceof Error ? cause.message : "Could not generate baseline.");
    } finally {
      setBaselineGenerating(false);
    }
  }

  async function handleGenerateReports() {
    setReportGenerationError(null);
    setGeneratingReports(true);
    try {
      await generateReports({ sessionSlug, questionId: activeQuestionId });
    } catch (cause) {
      setReportGenerationError(
        cause instanceof Error ? cause.message : "Could not generate reports.",
      );
    } finally {
      setGeneratingReports(false);
    }
  }

  async function handleTriggerCategorisation() {
    setCategorisationError(null);
    setCategorisationMessage(null);
    setTriggeringCategorisation(true);
    try {
      const job = await triggerCategorisation({ sessionSlug, questionId: activeQuestionId });
      setCategorisationMessage(`Categorisation ${job?.status ?? "queued"}.`);
    } catch (cause) {
      setCategorisationError(
        cause instanceof Error ? cause.message : "Could not start categorisation.",
      );
    } finally {
      setTriggeringCategorisation(false);
    }
  }

  async function handleSaveTemplate() {
    setSavingTemplate(true);
    try {
      await saveAsTemplate({ sessionSlug });
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 3000);
    } finally {
      setSavingTemplate(false);
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

  async function handleGenerateArgMap() {
    setArgMapQueued(true);
    try {
      await generateArgMap({ sessionSlug, questionId: activeQuestionId });
    } finally {
      setArgMapQueued(false);
    }
  }

  const artifactCounts = synthesis?.artifactCounts;
  const recentArtifacts = synthesis?.recentArtifacts ?? [];
  const latestClassSynthesis = synthesis?.latestClassSynthesis;
  const reportsSummary = reports?.summary as PersonalReportsSummary | undefined;
  const recentReports = reports?.recent ?? [];
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
  const reportBusy = generatingReports || isBusyStatus(latestReportJob?.status);
  const baselineBusy =
    baselineGenerating ||
    isBusyStatus(latestBaselineJob?.status) ||
    isBusyStatus(questionBaseline?.status);
  const baselineCanGenerate = selectedQuestion?.status === "released";
  const embeddingBusy = embeddingQueued || isBusyStatus(latestEmbeddingJob?.status);
  const argMapBusy = argMapQueued || isBusyStatus(latestArgumentMapJob?.status);
  const embeddingCount = semanticStatus?.embeddingCount ?? 0;
  const noveltyCount = semanticStatus?.noveltyCount ?? 0;
  const argumentLinkCount = semanticStatus?.argumentLinkCount ?? 0;
  const hasEmbeddings = embeddingCount > 0;
  const hasNoveltySignals = noveltyCount > 0;
  const hasArgumentLinks = argumentLinkCount > 0;
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
  const studentActivity = activity.filter((event) => event.actorType === "participant");
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
      status: latestReportJob?.status ?? (generatingReports ? "processing" : "idle"),
      detail:
        progressDetail(latestReportJob) ??
        (reportsSummary
          ? `${reportsSummary.success ?? 0} ready, ${(reportsSummary.queued ?? 0) + (reportsSummary.processing ?? 0)} in flight`
          : "No reports generated yet"),
      tone: reportGenerationError
        ? "error"
        : jobTone(latestReportJob, reportBusy ? "warning" : "sky"),
      error: latestReportJob?.error ?? reportGenerationError,
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
      tone: baselineError
        ? "error"
        : jobTone(latestBaselineJob, questionBaseline?.status === "ready" ? "success" : "neutral"),
      error: latestBaselineJob?.error ?? questionBaseline?.error ?? baselineError ?? undefined,
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
      status: latestArgumentMapJob?.status ?? (argMapQueued ? "queued" : "idle"),
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

      <AiJobStatusPanel
        items={aiJobStatusItems}
        contextLabel={overview.currentQuestion?.title ?? "the current question"}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <Card title="Synthesis">
          <p className="mb-3 text-xs leading-5 text-[var(--c-muted)]">
            Draft artifacts are instructor-only. Published and final artifacts are learner-facing
            only when synthesis is released for the current question
            {sessionPrivateVisibility ? " and session visibility is no longer private." : "."}
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Badge tone={synthesisReleasedForQuestion ? "success" : "warning"}>
              {synthesisReleasedForQuestion ? "Synthesis released" : "Synthesis hidden"}
            </Badge>
            {sessionPrivateVisibility ? <Badge tone="warning">Session visibility private</Badge> : null}
          </div>
          {artifactCounts ? (
            <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              <MetricTile label="Draft" value={String(artifactCounts.draft ?? 0)} />
              <MetricTile label="Published" value={String(artifactCounts.published ?? 0)} />
              <MetricTile label="Final" value={String(artifactCounts.final ?? 0)} />
              <MetricTile label="Error" value={String(artifactCounts.error ?? 0)} />
            </div>
          ) : null}

          {latestClassSynthesis ? (
            <div className="mb-3 rounded-md bg-[var(--c-surface-strong)] p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-sm font-semibold text-[var(--c-ink)]">
                  <Sparkle size={13} className="mr-1 inline" />
                  {latestClassSynthesis.title}
                </span>
                <Badge
                  tone={
                    latestClassSynthesis.status === "final"
                      ? "success"
                      : latestClassSynthesis.status === "published"
                        ? "sky"
                        : "neutral"
                  }
                >
                  {latestClassSynthesis.status}
                </Badge>
              </div>
              {latestClassSynthesis.summary ? (
                <p className="mt-2 text-sm leading-6 text-[var(--c-body)]">
                  {previewText(String(latestClassSynthesis.summary), 320)}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleGenerateClassSynthesis()}
              disabled={generatingClass}
            >
              {generatingClass ? "Generating..." : "Class Synthesis"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleGenerateClassSynthesis("opposing_views")}
              disabled={generatingOpposing}
            >
              {generatingOpposing ? "Generating..." : "Opposing Views"}
            </Button>
          </div>
        </Card>

        <Card title="Synthesis Artifacts">
          <div className="grid gap-3">
            {recentArtifacts.length === 0 ? (
              <p className="text-sm text-[var(--c-muted)]">No synthesis artifacts yet.</p>
            ) : (
              recentArtifacts.map((artifact) => (
                <SynthesisArtifactCard
                  key={artifact.id}
                  artifact={artifact}
                  sessionSlug={sessionSlug}
                  isInstructor
                />
              ))
            )}
          </div>
        </Card>
      </section>

      <Card title="Personal Reports">
        <p className="mb-3 text-xs leading-5 text-[var(--c-muted)]">
          Reports can be generated before they are released. Learners may use their private report
          page, while this view shows generation and preview state for instructors.
        </p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Badge tone={reportsReleasedForQuestion ? "success" : "warning"}>
            {reportsReleasedForQuestion ? "Reports released" : "Reports hidden in Me"}
          </Badge>
        </div>
        {reportsSummary ? (
          <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <MetricTile label="Total" value={String(reportsSummary.total ?? 0)} />
            <MetricTile label="Success" value={String(reportsSummary.success ?? 0)} />
            <MetricTile
              label="Processing"
              value={String((reportsSummary.queued ?? 0) + (reportsSummary.processing ?? 0))}
            />
            <MetricTile label="Error" value={String(reportsSummary.error ?? 0)} />
          </div>
        ) : null}

        <Button size="sm" variant="coral" onClick={handleGenerateReports} disabled={reportBusy}>
          {reportBusy ? "Generating..." : "Generate All Reports"}
        </Button>
        {reportGenerationError ? (
          <p className="mt-2 text-xs text-[var(--c-error)]">{reportGenerationError}</p>
        ) : null}

        <div className="mt-4 grid gap-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--c-muted)]">
            Recent reports
          </p>
          {recentReports.length === 0 ? (
            <p className="rounded-sm bg-[var(--c-surface-strong)] px-3 py-2 text-xs text-[var(--c-muted)]">
              No personal reports generated yet.
            </p>
          ) : (
            recentReports.slice(0, 6).map((report) => (
              <div key={report.id} className="rounded-sm bg-[var(--c-surface-strong)] px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-sm font-medium text-[var(--c-ink)]">
                      {report.nickname ?? "Unknown participant"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--c-muted)]">
                      {report.submissionCount ?? 0} responses · {report.followUpCount ?? 0}{" "}
                      follow-ups · {report.fightCount ?? 0} fights ·{" "}
                      {formatReportTime(report.generatedAt ?? report.updatedAt)}
                    </p>
                  </div>
                  <Badge
                    tone={
                      report.status === "success"
                        ? "success"
                        : report.status === "error"
                          ? "error"
                          : "warning"
                    }
                  >
                    {report.status}
                  </Badge>
                </div>
                {previewText(report.summary) ? (
                  <p className="mt-2 text-xs leading-relaxed text-[var(--c-body)]">
                    {previewText(report.summary)}
                  </p>
                ) : null}
                {report.status === "error" && report.error ? (
                  <p className="mt-1 text-[10px] leading-relaxed text-[var(--c-error)]">
                    Error: {report.error}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Card>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card title="Embeddings">
          {semanticStatus ? (
            <div className="mb-3 grid grid-cols-2 gap-2">
              <MetricTile label="Stored" value={String(embeddingCount)} />
              <MetricTile label="Submissions" value={String(semanticStatus.submissionCount)} />
            </div>
          ) : null}
          <Button size="sm" variant="secondary" onClick={handleQueueEmbeddings} disabled={embeddingBusy}>
            {embeddingBusy ? "Queued" : "Generate Embeddings"}
          </Button>
        </Card>

        <Card title="Novelty Signals">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <MetricTile label="Signals" value={String(noveltyCount)} />
            <MetricTile label="Ready" value={hasNoveltySignals ? "Yes" : "No"} />
          </div>
          <p className="mb-3 text-xs leading-5 text-[var(--c-muted)]">
            Refresh recomputes novelty from existing embeddings. It does not create missing
            embeddings.
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void refreshSignals({ sessionSlug, questionId: activeQuestionId })}
            disabled={!hasEmbeddings}
          >
            Refresh Signals
          </Button>
        </Card>

        <Card title="Argument Map Readiness">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <MetricTile label="Links" value={String(argumentLinkCount)} />
            <MetricTile label="Ready" value={hasArgumentLinks ? "Yes" : "No"} />
          </div>
          <p className="mb-3 text-xs leading-5 text-[var(--c-muted)]">
            Argument links are generated from responses, categories, and synthesis artifacts for
            the current question.
          </p>
          {latestArgumentMapJob?.error ? (
            <p className="text-xs text-[var(--c-error)]">{latestArgumentMapJob.error}</p>
          ) : null}
          <Button size="sm" variant="secondary" onClick={handleGenerateArgMap} disabled={argMapBusy}>
            {argMapBusy ? "Queued" : "Generate Argument Map"}
          </Button>
        </Card>

        <Card title="Category Drift Readiness">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <MetricTile label="Slices" value={String(categoryDrift?.slices.length ?? 0)} />
            <MetricTile label="Transitions" value={String(categoryDrift?.transitions.length ?? 0)} />
          </div>
          <p className="text-xs leading-5 text-[var(--c-muted)]">
            Drift is deterministic analysis over categorised initial and follow-up responses. It
            becomes useful after categorisation and follow-up rounds exist.
          </p>
        </Card>
      </section>

      {semanticStatus?.readiness.canShowNoveltyRadar && noveltyRadar ? (
        <Card title="Novelty Radar">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <MetricTile label="Low" value={String(noveltyRadar.distribution.low)} />
            <MetricTile label="Medium" value={String(noveltyRadar.distribution.medium)} />
            <MetricTile label="High" value={String(noveltyRadar.distribution.high)} />
          </div>
          <div className="grid gap-2">
            {noveltyRadar.topDistinctive.slice(0, 5).map((item: NoveltyRadarItem) => (
              <div key={item.signalId} className="rounded-sm bg-[var(--c-surface-strong)] p-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[var(--c-ink)]">{item.participantLabel}</span>
                  <Badge tone="mustard">{item.band}</Badge>
                </div>
                {item.bodyPreview ? (
                  <p className="mt-1 text-xs text-[var(--c-body)]">
                    {previewText(item.bodyPreview, 140)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {categoryDrift && categoryDrift.slices.length > 0 ? (
        <Card title="Category Drift">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-[var(--c-hairline)] text-left text-[var(--c-muted)]">
                  <th className="py-1 pr-2 font-medium">Slice</th>
                  {categoryDrift.slices[0].categoryCounts.map((cell: CategoryCountCell) => (
                    <th key={cell.categoryId} className="py-1 pr-2 font-medium">
                      {cell.categoryName?.split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categoryDrift.slices.map((slice: CategoryDriftSlice) => (
                  <tr key={slice.key} className="border-b border-[var(--c-hairline)]">
                    <td className="py-1 pr-2 text-[var(--c-ink)]">{slice.label}</td>
                    {slice.categoryCounts.map((cell: CategoryCountCell) => (
                      <td key={cell.categoryId} className="py-1 pr-2 font-mono text-[var(--c-body)]">
                        {cell.count}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {semanticStatus?.readiness.canShowArgumentMap && argumentGraph ? (
        <Card title="Argument Map">
          <ArgumentMapGraph
            nodes={argumentGraph.nodes}
            edges={argumentGraph.edges}
            rendererLabel={argumentGraph.layout?.suggestedRenderer}
          />
        </Card>
      ) : null}

      <Card title="Recent Submissions">
        <div className="grid gap-3">
          {recentSubmissions.length === 0 ? (
            <p className="text-sm text-[var(--c-muted)]">No submissions yet.</p>
          ) : (
            recentSubmissions.slice(0, 8).map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))
          )}
        </div>
      </Card>
    </div>
  );

  return (
    <InstructorShell
      sessionTitle={session.title}
      sessionCode={session.joinCode}
      participantCount={session.participantCount}
      actIndex={PHASE_ORDER.indexOf(session.phase as Phase) - 1}
      onPreviousAct={retreatPhase}
      onNextAct={advancePhase}
      left={
        <div className="flex min-h-full flex-col gap-6 bg-gradient-to-b from-[#18324c] to-[#12263a] p-5 text-[#d9e7f3]">
          <section className="border-b border-white/10 pb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b8cadb]">
              Session
            </p>
            <h2 className="mt-2 font-display text-base font-semibold text-white">
              {session.title}
            </h2>
            <p className="mt-2 text-xs leading-5 text-[#8ea4bb]">
              Entry links stay intentional: Open Room for live use, Open Setup for preparation.
            </p>
          </section>

          <nav className="grid gap-2">
            {INSTRUCTOR_WORKSPACE_TABS.map((tab) => {
              const Icon = tab.icon;

              return (
                <a
                  key={tab.id}
                  href={workspaceHref(tab.id)}
                  className={cn(
                    "inline-flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 text-sm font-semibold transition",
                    workspaceTab === tab.id
                      ? "bg-white/12 text-white"
                      : "text-[#b8cadb] hover:bg-white/8 hover:text-white",
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon size={16} />
                    {tab.label}
                  </span>
                  <span className="text-[11px] font-semibold text-[#8ea4bb]">
                    {tab.id === "room" ? "Live" : tab.id === "setup" ? "Prepare" : "Review"}
                  </span>
                </a>
              );
            })}
          </nav>

          {workspaceTab === "room" ? (
            <section className="grid gap-2 border-t border-white/10 pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b8cadb]">
                Room Modes
              </p>
              {ROOM_MODES.map((mode) => {
                const Icon = mode.icon;

                return (
                  <a
                    key={mode.id}
                    href={roomModeHref(mode.id)}
                    className={cn(
                      "inline-flex min-h-10 items-center justify-between gap-3 rounded-xl px-3 text-sm font-semibold transition",
                      roomMode === mode.id
                        ? "bg-white/12 text-white"
                        : "text-[#b8cadb] hover:bg-white/8 hover:text-white",
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon size={15} />
                      {mode.label}
                    </span>
                    <span className="text-[11px] font-semibold text-[#8ea4bb]">
                      {mode.id === "latest"
                        ? "Default"
                        : mode.id === "categories"
                          ? "Board"
                          : "Phase 17"}
                    </span>
                  </a>
                );
              })}
            </section>
          ) : null}

          <p className="mt-auto border-t border-white/10 pt-5 text-xs leading-5 text-[#8ea4bb]">
            Room is for live reading and intervention. Setup holds drafting and configuration.
            Reports holds synthesis, argument map, personal reports, and AI review surfaces.
          </p>

          <div className="hidden">
          {/* Category board */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--c-muted)]">
              Categories ({activeCategories.length})
            </span>
            <button
              type="button"
              onClick={() => {
                setCategoryError(null);
                setShowAddCategory((value) => !value);
              }}
              className="text-xs text-[var(--c-link)] underline"
            >
              + Add
            </button>
          </div>
          {showAddCategory && (
            <form
              className="grid gap-2 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-2.5"
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateCategory();
              }}
            >
              <input
                value={addCategoryName}
                onChange={(event) => setAddCategoryName(event.target.value)}
                placeholder="Category name"
                className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-2 py-1 text-xs text-[var(--c-ink)]"
              />
              <textarea
                value={addCategoryDescription}
                onChange={(event) => setAddCategoryDescription(event.target.value)}
                placeholder="Short description"
                rows={2}
                className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-2 py-1 text-xs text-[var(--c-ink)]"
              />
              {categoryError && (
                <p className="text-[10px] text-[var(--c-error)]">{categoryError}</p>
              )}
              <div className="flex gap-1.5">
                <Button
                  type="submit"
                  size="sm"
                  className="flex-1"
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
          )}
          {activeCategories.map((cat, i) => (
            <div
              key={cat.id}
              className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-2.5"
              style={{ borderLeft: `3px solid var(--c-sig-${categoryColorToTone(cat.color, i)})` }}
            >
              <div className="flex items-center justify-between">
                <strong className="font-display text-xs text-[var(--c-ink)]">{cat.name}</strong>
                <span className="text-[10px] text-[var(--c-muted)]">{cat.assignmentCount}</span>
              </div>
              {cat.description && (
                <p className="mt-1 text-[10px] leading-relaxed text-[var(--c-muted)]">
                  {cat.description.slice(0, 60)}
                  {cat.description.length > 60 ? "..." : ""}
                </p>
              )}
              {editingCategoryId === cat.id && (
                <form
                  className="mt-2 grid gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleRenameCategory(cat.id);
                  }}
                >
                  <input
                    value={editingCategoryName}
                    onChange={(event) => setEditingCategoryName(event.target.value)}
                    className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-2 py-1 text-xs text-[var(--c-ink)]"
                  />
                  <textarea
                    value={editingCategoryDescription}
                    onChange={(event) => setEditingCategoryDescription(event.target.value)}
                    rows={2}
                    className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-2 py-1 text-xs text-[var(--c-ink)]"
                  />
                  {categoryError && (
                    <p className="text-[10px] text-[var(--c-error)]">{categoryError}</p>
                  )}
                  <div className="flex gap-1.5">
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
              )}
              {followUpCategoryId === cat.id && (
                <form
                  className="mt-2 grid gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleCreateCategoryFollowUp(cat.id);
                  }}
                >
                  <textarea
                    value={followUpPrompt}
                    onChange={(event) => setFollowUpPrompt(event.target.value)}
                    rows={3}
                    placeholder="Follow-up question for this category"
                    className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-2 py-1 text-xs text-[var(--c-ink)]"
                  />
                  {followUpError && (
                    <p className="text-[10px] text-[var(--c-error)]">{followUpError}</p>
                  )}
                  <div className="flex gap-1.5">
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
              )}
              <div className="mt-1.5 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => startRenameCategory(cat)}
                  className="rounded bg-[var(--c-surface-strong)] px-1.5 py-0.5 text-[9px]"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => startCategoryFollowUp(cat)}
                  className="rounded bg-[var(--c-sig-slate)] px-1.5 py-0.5 text-[9px] text-white"
                >
                  Follow-up
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateCategorySummary(cat.id)}
                  disabled={generatingCategoryId === cat.id}
                  className="rounded bg-[var(--c-sig-peach)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--c-on-sig-light)] disabled:opacity-50"
                >
                  {generatingCategoryId === cat.id ? (
                    <CircleNotch size={9} className="inline animate-spin" />
                  ) : (
                    <>
                      <BookOpen size={9} className="mr-0.5 inline" />
                      Summarize
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}

          {responses.uncategorized > 0 && (
            <div
              className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-2.5"
              style={{ borderLeft: "3px solid var(--c-muted)" }}
            >
              <div className="flex items-center justify-between">
                <strong className="text-xs text-[var(--c-muted)]">Uncategorized</strong>
                <span className="text-[10px] text-[var(--c-muted)]">{responses.uncategorized}</span>
              </div>
              <button
                type="button"
                onClick={() => void handleTriggerCategorisation()}
                disabled={categorisationBusy}
                className="mt-1.5 rounded bg-[var(--c-sig-yellow)] px-2 py-0.5 text-[10px] font-medium text-[var(--c-on-sig-light)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {triggeringCategorisation
                  ? "Queueing..."
                  : categorisationBusy
                    ? "Categorising..."
                    : "Run categorisation"}
              </button>
              {latestCategorisationJob && (
                <p className="mt-1 text-[10px] text-[var(--c-muted)]">
                  Latest job: {latestCategorisationJob.status}
                  {typeof latestCategorisationJob.progressDone === "number" &&
                  typeof latestCategorisationJob.progressTotal === "number"
                    ? ` (${latestCategorisationJob.progressDone}/${latestCategorisationJob.progressTotal})`
                    : ""}
                </p>
              )}
              {categorisationMessage && (
                <p className="mt-1 text-[10px] text-[var(--c-success)]">
                  {categorisationMessage}
                </p>
              )}
              {(categorisationError ||
                (latestCategorisationJob?.status === "error" && latestCategorisationJob.error)) && (
                <p className="mt-1 text-[10px] text-[var(--c-error)]">
                  {categorisationError ?? latestCategorisationJob?.error}
                </p>
              )}
            </div>
          )}

          {/* QR code */}
          <Card title="Join Access" eyebrow={session.joinCode}>
            <div className="grid justify-items-start gap-3">
              <div className="rounded-md bg-white p-3">
                <QRCodeSVG value={joinUrl} size={140} />
              </div>
              <p className="break-all text-[10px] text-[var(--c-muted)]">{joinUrl}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => (window.location.href = routes.instructorProjector(session.slug))}
              >
                Open projector
              </Button>
            </div>
          </Card>

          {/* Save as template */}
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            icon={<FloppyDisk size={14} />}
            onClick={handleSaveTemplate}
            disabled={savingTemplate}
          >
            {templateSaved ? "Template saved!" : savingTemplate ? "Saving..." : "Save as Template"}
          </Button>
          </div>
        </div>
      }
      center={
        workspaceTab === "room" ? (
          roomWorkspace
        ) : workspaceTab === "reports" ? (
          reportsWorkspace
        ) : (
          <div className="grid gap-3 p-5 lg:p-7">
          <QuestionManagerPanel
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
          />

          <AiJobStatusPanel
            items={aiJobStatusItems}
            contextLabel={overview.currentQuestion?.title ?? "the current question"}
          />

          <Card title="Hidden Baseline Diagnostics">
            <p className="text-xs leading-5 text-[var(--c-muted)]">
              The baseline is the instructor-side reference answer used by private feedback and
              personal reports. Learners never see the baseline text.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              <MetricTile label="Status" value={questionBaseline?.status ?? "missing"} />
              <MetricTile label="Provider" value={questionBaseline?.provider ?? "none"} />
              <MetricTile label="Model" value={questionBaseline?.model ?? "none"} />
              <MetricTile
                label="Generated"
                value={
                  questionBaseline?.generatedAt
                    ? new Date(questionBaseline.generatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "not yet"
                }
              />
            </div>
            <div className="mt-3 rounded-sm bg-[var(--c-surface-strong)] p-2.5">
              <p className="text-[10px] text-[var(--c-muted)]">
                Prompt: {questionBaseline?.promptTemplateKey ?? "question.baseline.v1"}
              </p>
              {questionBaseline?.error || baselineError ? (
                <p className="mt-1 text-[11px] leading-4 text-[var(--c-error)]">
                  {questionBaseline?.error ?? baselineError}
                </p>
              ) : null}
              {!baselineCanGenerate ? (
                <p className="mt-1 text-[11px] leading-4 text-[var(--c-sig-mustard)]">
                  Release a question before generating its baseline.
                </p>
              ) : null}
            </div>
            <Button
              className="mt-3 w-full"
              size="sm"
              variant="secondary"
              onClick={() => void handleGenerateBaseline(Boolean(questionBaseline))}
              disabled={baselineBusy || !baselineCanGenerate}
            >
              {baselineBusy ? (
                <>
                  <CircleNotch size={12} className="mr-1 inline animate-spin" />
                  Queued
                </>
              ) : questionBaseline ? (
                "Regenerate Baseline"
              ) : (
                "Generate Baseline"
              )}
            </Button>
          </Card>

          <Card title="AI Readiness">
            <p className="text-xs leading-5 text-[var(--c-muted)]">
              This checks the operational prerequisites that commonly block AI work: API key,
              enabled models, prompt templates, budget stops, demo failure toggles, and recent LLM
              errors.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              <MetricTile
                label="OpenAI key"
                value={
                  openAiKeyState === "ready"
                    ? "ready"
                    : openAiKeyState === "missing"
                      ? "missing"
                      : openAiKeyState
                }
              />
              <MetricTile label="Models" value={String(modelSettings?.length ?? 0)} />
              <MetricTile label="Prompts" value={String(promptTemplates?.length ?? 0)} />
              <MetricTile label="Budget" value={`${budgetUsagePercent}%`} />
            </div>
            <div className="mt-3 grid gap-2 text-xs">
              <div className="rounded-sm bg-[var(--c-surface-strong)] p-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-[var(--c-ink)]">Model coverage</span>
                  <Badge tone={missingModelFeatures.length === 0 ? "success" : "warning"}>
                    {missingModelFeatures.length === 0 ? "ready" : "missing"}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-[var(--c-muted)]">
                  {missingModelFeatures.length === 0
                    ? "Enabled models cover all AI workflow features."
                    : `Missing enabled model features: ${missingModelFeatures.map((item) => item.label).join(", ")}.`}
                </p>
              </div>

              <div className="rounded-sm bg-[var(--c-surface-strong)] p-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-[var(--c-ink)]">Prompt templates</span>
                  <Badge tone={missingPromptKeys.length === 0 ? "success" : "warning"}>
                    {missingPromptKeys.length === 0 ? "ready" : "missing"}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-[var(--c-muted)]">
                  {missingPromptKeys.length === 0
                    ? "Required prompt templates are present."
                    : `Missing prompts: ${missingPromptKeys
                        .map((item) => item.promptKey)
                        .filter(Boolean)
                        .join(", ")}.`}
                </p>
              </div>

              <div className="rounded-sm bg-[var(--c-surface-strong)] p-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-[var(--c-ink)]">Budget and demo controls</span>
                  <Badge
                    tone={
                      budgetHardStopActive || activeDemoToggles.length > 0 ? "warning" : "success"
                    }
                  >
                    {budgetHardStopActive || activeDemoToggles.length > 0 ? "attention" : "clear"}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-[var(--c-muted)]">
                  {budgetHardStopActive
                    ? "Budget hard stop is active for this session."
                    : "No budget hard stop is currently blocking this session."}
                </p>
                {activeDemoToggles.length > 0 ? (
                  <p className="mt-1 text-[11px] text-[var(--c-sig-mustard)]">
                    Active demo toggles: {activeDemoToggles.map((toggle) => toggle.key).join(", ")}.
                  </p>
                ) : null}
              </div>

              <div className="rounded-sm bg-[var(--c-surface-strong)] p-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-[var(--c-ink)]">Recent LLM failures</span>
                  <Badge tone={recentLlmFailures.length === 0 ? "success" : "error"}>
                    {recentLlmFailures.length}
                  </Badge>
                </div>
                {recentLlmFailures.length === 0 ? (
                  <p className="mt-1 text-[11px] text-[var(--c-muted)]">
                    No recent LLM errors found for this session.
                  </p>
                ) : (
                  <div className="mt-1 grid gap-1">
                    {recentLlmFailures.map((call) => (
                      <p key={call.id} className="text-[11px] leading-4 text-[var(--c-error)]">
                        {call.feature}: {call.error ?? "Unknown error"}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {pendingRecatRequests && pendingRecatRequests.length > 0 && (
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
                      className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-surface-strong)] p-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-[var(--c-ink)]">
                            {requestedCategory
                              ? `Move to ${requestedCategory.name}`
                              : `Suggested: ${request.suggestedCategoryName ?? "New category"}`}
                          </p>
                          <p className="mt-1 text-[11px] leading-5 text-[var(--c-body)]">
                            {request.reason}
                          </p>
                        </div>
                        <Badge tone="warning">{request.status}</Badge>
                      </div>
                      <div className="mt-2 flex justify-end gap-2">
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
          )}

          <PresenceBar
            typing={presence.typing}
          />

          {/* Consensus pulse placeholder */}
          <Card>
            <p className="mb-1.5 text-[10px] text-[var(--c-muted)]">Consensus Pulse</p>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[var(--c-sig-coral)]">Against</span>
              <div className="flex h-2.5 flex-1 overflow-hidden rounded-pill bg-[var(--c-hairline)]">
                <div className="bg-[var(--c-sig-coral)]" style={{ width: "30%" }} />
                <div className="bg-[var(--c-sig-mustard)]" style={{ width: "25%" }} />
                <div className="bg-[var(--c-sig-sky)]" style={{ width: "45%" }} />
              </div>
              <span className="text-[10px] text-[var(--c-sig-sky)]">For</span>
            </div>
          </Card>

          <Card title="Input Patterns">
            <div className="grid gap-1.5 text-sm">
              {(Object.keys(patternCounts) as InputPattern[]).map((pattern) => (
                <div key={pattern} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[var(--c-body)]">{inputPatternLabel(pattern)}</span>
                  <span className="font-mono text-xs text-[var(--c-ink)]">
                    {patternCounts[pattern]}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Synthesis Dashboard */}
          <Card title="Synthesis">
            <p className="mb-3 text-xs leading-5 text-[var(--c-muted)]">
              Draft artifacts are instructor-only. Published and final artifacts are learner-facing
              only when synthesis is released for the current question
              {sessionPrivateVisibility ? " and session visibility is no longer private." : "."}
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <Badge tone={synthesisReleasedForQuestion ? "success" : "warning"}>
                {synthesisReleasedForQuestion ? "Synthesis released" : "Synthesis hidden"}
              </Badge>
              {sessionPrivateVisibility ? (
                <Badge tone="warning">Session visibility private</Badge>
              ) : null}
            </div>
            {artifactCounts && (
              <div className="mb-3 grid grid-cols-4 gap-2">
                <MetricTile label="Draft" value={String(artifactCounts.draft ?? 0)} />
                <MetricTile label="Published" value={String(artifactCounts.published ?? 0)} />
                <MetricTile label="Final" value={String(artifactCounts.final ?? 0)} />
                <MetricTile label="Error" value={String(artifactCounts.error ?? 0)} />
              </div>
            )}

            {latestClassSynthesis && (
              <div className="mb-3 rounded-md bg-[var(--c-surface-strong)] p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[11px] font-semibold text-[var(--c-ink)]">
                    <Sparkle size={11} className="mr-0.5 inline" /> {latestClassSynthesis.title}
                  </span>
                  <Badge
                    tone={
                      latestClassSynthesis.status === "final"
                        ? "success"
                        : latestClassSynthesis.status === "published"
                          ? "sky"
                          : "neutral"
                    }
                    className="text-[9px]"
                  >
                    {latestClassSynthesis.status}
                  </Badge>
                </div>
                {latestClassSynthesis.summary && (
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--c-body)]">
                    {typeof latestClassSynthesis.summary === "string" &&
                    latestClassSynthesis.summary.length > 200
                      ? `${latestClassSynthesis.summary.slice(0, 200)}...`
                      : latestClassSynthesis.summary}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => handleGenerateClassSynthesis()}
                disabled={generatingClass}
              >
                {generatingClass ? (
                  <>
                    <CircleNotch size={12} className="mr-1 inline animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkle size={12} className="mr-1 inline" />
                    Class Synthesis
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => handleGenerateClassSynthesis("opposing_views")}
                disabled={generatingOpposing}
              >
                {generatingOpposing ? (
                  <>
                    <CircleNotch size={12} className="mr-1 inline animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Scales size={12} className="mr-1 inline" />
                    Opposing Views
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Personal Reports */}
          <Card title="Personal Reports">
            <p className="mb-3 text-xs leading-5 text-[var(--c-muted)]">
              Reports can be generated before they are released. Learners may use their private
              report page, while this question view shows report cards only after release.
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <Badge tone={reportsReleasedForQuestion ? "success" : "warning"}>
                {reportsReleasedForQuestion ? "Reports released" : "Reports hidden in Me"}
              </Badge>
            </div>
            {reportsSummary && (
              <div className="mb-3 grid grid-cols-4 gap-2">
                <MetricTile label="Total" value={String(reportsSummary.total ?? 0)} />
                <MetricTile label="Success" value={String(reportsSummary.success ?? 0)} />
                <MetricTile
                  label="Processing"
                  value={String((reportsSummary.queued ?? 0) + (reportsSummary.processing ?? 0))}
                />
                <MetricTile label="Error" value={String(reportsSummary.error ?? 0)} />
              </div>
            )}

            <Button
              variant="coral"
              size="sm"
              className="w-full"
              onClick={handleGenerateReports}
              disabled={reportBusy}
            >
              {reportBusy ? (
                <>
                  <CircleNotch size={12} className="mr-1 inline animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate All Reports"
              )}
            </Button>

            {reportGenerationError && (
              <p className="mt-2 text-xs text-[var(--c-error)]">{reportGenerationError}</p>
            )}

            <div className="mt-3 space-y-2">
              <p className="text-[10px] text-[var(--c-muted)]">Recent reports</p>
              {recentReports.length === 0 && (
                <p className="rounded-sm bg-[var(--c-surface-strong)] px-3 py-2 text-xs text-[var(--c-muted)]">
                  No personal reports generated yet.
                </p>
              )}
              {recentReports.length > 0 && (
                <>
                  {recentReports.slice(0, 6).map((report) => (
                    <div
                      key={report.id}
                      className="rounded-sm bg-[var(--c-surface-strong)] px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-sm font-medium text-[var(--c-ink)]">
                            {report.nickname ?? "Unknown participant"}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[var(--c-muted)]">
                            {report.submissionCount ?? 0} responses · {report.followUpCount ?? 0}{" "}
                            follow-ups · {report.fightCount ?? 0} fights ·{" "}
                            {formatReportTime(report.generatedAt ?? report.updatedAt)}
                          </p>
                        </div>
                        <Badge
                          tone={
                            report.status === "success"
                              ? "success"
                              : report.status === "error"
                                ? "error"
                                : "warning"
                          }
                          className="text-[8px]"
                        >
                          {report.status}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(
                          [
                            ["sky", report.participationBand],
                            ["peach", report.reasoningBand],
                            ["mustard", report.originalityBand],
                            ["cream", report.responsivenessBand],
                          ] satisfies Array<[NonNullable<BadgeProps["tone"]>, string | undefined]>
                        ).map(([tone, band], index) =>
                          band ? (
                            <Badge
                              key={`${report.id}-${index}`}
                              tone={tone}
                              className="text-[8px]"
                            >
                              {BAND_LABELS[band] ?? band}
                            </Badge>
                          ) : null,
                        )}
                      </div>
                      {previewText(report.summary) && (
                        <p className="mt-2 text-xs leading-relaxed text-[var(--c-body)]">
                          {previewText(report.summary)}
                        </p>
                      )}
                      {previewText(report.contributionTrace, 130) && (
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--c-muted)]">
                          Trace: {previewText(report.contributionTrace, 130)}
                        </p>
                      )}
                      {report.status === "error" && report.error && (
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--c-error)]">
                          Error: {report.error}
                        </p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </Card>

          <Card title="Recent Submissions">
            <div className="grid gap-3">
              {recentSubmissions.length === 0 && (
                <p className="text-sm text-[var(--c-muted)]">No submissions yet.</p>
              )}
              {recentSubmissions.slice(0, 8).map((sub) => (
                <SubmissionCard key={sub.id} submission={sub} />
              ))}
            </div>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            <Card title="Embeddings">
              {semanticStatus && (
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <MetricTile label="Stored" value={String(embeddingCount)} />
                  <MetricTile label="Submissions" value={String(semanticStatus.submissionCount)} />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={handleQueueEmbeddings}
                  disabled={embeddingBusy}
                >
                  {embeddingBusy ? (
                    <>
                      <CircleNotch size={12} className="mr-1 inline animate-spin" />
                      Queued
                    </>
                  ) : (
                    "Generate Embeddings"
                  )}
                </Button>
              </div>
            </Card>

            <Card title="Novelty Signals">
              <div className="mb-3 grid grid-cols-2 gap-2">
                <MetricTile label="Signals" value={String(noveltyCount)} />
                <MetricTile label="Ready" value={hasNoveltySignals ? "Yes" : "No"} />
              </div>
              <p className="mb-3 text-xs leading-5 text-[var(--c-muted)]">
                Refresh recomputes novelty from existing embeddings. It does not create missing
                embeddings.
              </p>
              {!hasEmbeddings ? (
                <p className="text-xs text-[var(--c-sig-mustard)]">
                  Generate embeddings before refreshing novelty signals.
                </p>
              ) : null}
              <Button
                size="sm"
                variant="secondary"
                className="mt-3 w-full"
                onClick={() => void refreshSignals({ sessionSlug, questionId: activeQuestionId })}
                disabled={!hasEmbeddings}
              >
                Refresh Signals
              </Button>
            </Card>

            <Card title="Argument Map Readiness">
              <div className="mb-3 grid grid-cols-2 gap-2">
                <MetricTile label="Links" value={String(argumentLinkCount)} />
                <MetricTile label="Ready" value={hasArgumentLinks ? "Yes" : "No"} />
              </div>
              <p className="mb-3 text-xs leading-5 text-[var(--c-muted)]">
                Argument links are generated from responses, categories, and synthesis artifacts for
                the current question.
              </p>
              {latestArgumentMapJob?.error ? (
                <p className="text-xs text-[var(--c-error)]">{latestArgumentMapJob.error}</p>
              ) : null}
              <Button
                size="sm"
                variant="secondary"
                className="mt-3 w-full"
                onClick={handleGenerateArgMap}
                disabled={argMapBusy}
              >
                {argMapBusy ? (
                  <>
                    <CircleNotch size={12} className="mr-1 inline animate-spin" />
                    Queued
                  </>
                ) : (
                  "Generate Argument Map"
                )}
              </Button>
            </Card>

            <Card title="Category Drift Readiness">
              <div className="mb-3 grid grid-cols-2 gap-2">
                <MetricTile label="Slices" value={String(categoryDrift?.slices.length ?? 0)} />
                <MetricTile
                  label="Transitions"
                  value={String(categoryDrift?.transitions.length ?? 0)}
                />
              </div>
              <p className="text-xs leading-5 text-[var(--c-muted)]">
                Drift is deterministic analysis over categorised initial and follow-up responses. It
                becomes useful after categorisation and follow-up rounds exist.
              </p>
            </Card>
          </div>

          {/* Novelty Radar */}
          {semanticStatus?.readiness.canShowNoveltyRadar && noveltyRadar && (
            <Card title="Novelty Radar">
              <div className="mb-3 grid grid-cols-3 gap-2">
                <MetricTile label="Low" value={String(noveltyRadar.distribution.low)} />
                <MetricTile label="Medium" value={String(noveltyRadar.distribution.medium)} />
                <MetricTile label="High" value={String(noveltyRadar.distribution.high)} />
              </div>

              {noveltyRadar.topDistinctive.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-[10px] text-[var(--c-muted)]">Top Distinctive</p>
                  {noveltyRadar.topDistinctive.slice(0, 5).map((item: NoveltyRadarItem) => (
                    <div
                      key={item.signalId}
                      className="mb-1.5 rounded-sm bg-[var(--c-surface-strong)] p-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--c-ink)]">
                          {item.participantLabel}
                        </span>
                        <div className="flex gap-1">
                          {item.categoryName && (
                            <Badge
                              tone={categoryColorToTone(item.categoryColor)}
                              className="text-[8px]"
                            >
                              {item.categoryName}
                            </Badge>
                          )}
                          <Badge tone="mustard" className="text-[8px]">
                            {item.band}
                          </Badge>
                        </div>
                      </div>
                      {item.bodyPreview && (
                        <p className="mt-0.5 text-[10px] text-[var(--c-body)]">
                          {item.bodyPreview.length > 100
                            ? `${item.bodyPreview.slice(0, 100)}...`
                            : item.bodyPreview}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {noveltyRadar.categoryAverages.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {noveltyRadar.categoryAverages.map((cat: NoveltyRadarCategoryAverage) => (
                    <Badge
                      key={cat.categoryId}
                      tone={categoryColorToTone(cat.categoryColor)}
                      className="text-[8px]"
                    >
                      {cat.categoryName}: {cat.averageNoveltyScore.toFixed(1)}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Category Drift */}
          {categoryDrift && categoryDrift.slices.length > 0 && (
            <Card title="Category Drift">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-[var(--c-hairline)] text-left text-[var(--c-muted)]">
                      <th className="py-1 pr-2 font-medium">Slice</th>
                      {categoryDrift.slices[0].categoryCounts.map((c: CategoryCountCell) => (
                        <th key={c.categoryId} className="py-1 pr-2 font-medium">
                          {c.categoryName?.split(" ")[0]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categoryDrift.slices.map((slice: CategoryDriftSlice) => (
                      <tr key={slice.key} className="border-b border-[var(--c-hairline)]">
                        <td className="py-1 pr-2 text-[var(--c-ink)]">{slice.label}</td>
                        {slice.categoryCounts.map((c: CategoryCountCell) => (
                          <td
                            key={c.categoryId}
                            className="py-1 pr-2 font-mono text-[var(--c-body)]"
                          >
                            {c.count}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {categoryDrift.transitions.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] text-[var(--c-muted)]">
                    {categoryDrift.transitions.length} transition
                    {categoryDrift.transitions.length !== 1 ? "s" : ""} detected
                  </p>
                </div>
              )}
              {categoryDrift.positionShifts.length > 0 && (
                <div className="mt-1">
                  <p className="text-[10px] text-[var(--c-muted)]">
                    {categoryDrift.positionShifts.length} position shift
                    {categoryDrift.positionShifts.length !== 1 ? "s" : ""} recorded
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Argument Map */}
          {semanticStatus?.readiness.canShowArgumentMap && argumentGraph && (
            <Card title="Argument Map">
              <ArgumentMapGraph
                nodes={argumentGraph.nodes}
                edges={argumentGraph.edges}
                rendererLabel={argumentGraph.layout?.suggestedRenderer}
              />
            </Card>
          )}
          </div>
        )
      }
      right={
        <div className="flex min-h-full flex-col gap-5 p-5 text-[var(--c-body)]">
          <section className="border-b border-[#d7e0ea] pb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">
              Persistent Live Rail
            </p>
            <h2 className="mt-2 font-display text-base font-semibold text-[var(--c-ink)]">
              Quick actions from any tab
            </h2>
            <p className="mt-2 text-xs leading-5 text-[var(--c-muted)]">
              Live controls stay reachable without forcing a workspace switch. Deep setup and
              review surfaces live in the center tabs.
            </p>
          </section>

          <section className="rounded-2xl border border-[#dbe5ef] bg-white/75 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">
              Selected Question
            </p>
            <p className="mt-2 font-display text-sm font-semibold leading-5 text-[var(--c-ink)]">
              {selectedQuestion?.title ?? "No question selected"}
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--c-muted)]">
              {selectedQuestionSummary?.counts.submissions ?? 0} submissions /{" "}
              {selectedQuestionSummary?.counts.uncategorized ?? responses.uncategorized}{" "}
              uncategorized
            </p>
          </section>

          <section className="border-b border-[#d7e0ea] pb-5">
            <p className="mb-2 text-xs font-semibold text-[var(--c-ink)]">Question switcher</p>
            <div className="grid gap-2">
              {questions.map((question) => (
                <a
                  key={question.id}
                  href={questionHref(question.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs transition",
                    selectedQuestion?.id === question.id
                      ? "border-[#17212b] bg-white text-[var(--c-ink)]"
                      : "border-[#d7e0ea] text-[var(--c-muted)] hover:bg-white hover:text-[var(--c-ink)]",
                  )}
                >
                  <span className="block truncate font-medium">{question.title}</span>
                  <span className="mt-0.5 block text-[10px]">{question.status}</span>
                </a>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#dbe5ef] bg-white/75 p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">
              Release + Interaction
            </p>
            <div className="grid gap-2.5">
              {[
                ["Contributions", session.phase === "submit" ? "Open" : "Not submit"],
                [
                  "Peer responses",
                  session.visibilityMode === "raw_responses_visible" ? "Visible" : "Hidden",
                ],
                [
                  "Category board",
                  session.visibilityMode === "private_until_released" ? "Hidden" : "Visible",
                ],
                ["Synthesis", synthesisReleasedForQuestion ? "Visible" : "Hidden"],
                ["Reports", reportsReleasedForQuestion ? "Visible" : "Hidden"],
                ["Replies", "On"],
                ["Upvotes", "On"],
                ["Fight", session.fightMeEnabled ? "On" : "Off"],
                ["Reports gate", session.summaryGateEnabled ? "On" : "Off"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 border-b border-[#e5edf4] pb-2 last:border-b-0 last:pb-0"
                >
                  <span className="text-sm text-[var(--c-ink)]">{label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-bold",
                      ["Open", "Visible", "On"].includes(value)
                        ? "bg-[#dff6f0] text-[#0f766e]"
                        : "bg-[#edf2f7] text-[var(--c-muted)]",
                    )}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#dbe5ef] bg-white/75 p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">
              Live Counters
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Typing now", presence.typing],
                ["Submitted", presence.submitted],
                ["Idle", presence.idle],
                ["Uncategorized", selectedQuestionSummary?.counts.uncategorized ?? responses.uncategorized],
                ["Pending recat", recategorisation.pendingCount],
              ].map(([label, value]) => (
                <div key={label} className="border-t border-[#d7e0ea] py-2">
                  <strong className="block font-display text-xl text-[var(--c-ink)]">{value}</strong>
                  <span className="text-[10px] text-[var(--c-muted)]">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#eadfcb] bg-[#fffaf2]/75 p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">
              Quick Live Actions
            </p>
            <div className="grid gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void handleVisibilityChange("category_summary_only")}
                disabled={session.visibilityMode === "category_summary_only"}
              >
                Release summaries
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void handleVisibilityChange("raw_responses_visible")}
                disabled={session.visibilityMode === "raw_responses_visible"}
              >
                Release responses
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void handleVisibilityChange("private_until_released")}
                disabled={session.visibilityMode === "private_until_released"}
              >
                Hide room
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void handleTriggerCategorisation()}
                disabled={categorisationBusy}
              >
                {categorisationBusy ? "Categorising..." : "Run categorisation"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => handleGenerateClassSynthesis()}
                disabled={generatingClass}
              >
                {generatingClass ? "Generating..." : "Generate synthesis"}
              </Button>
            </div>
          </section>

          <section className="grid gap-2">
            <p className="text-xs font-semibold text-[var(--c-muted)]">Live Activity</p>
            {studentActivity.length === 0 ? (
              <p className="text-sm text-[var(--c-muted)]">No student activity yet.</p>
            ) : (
              studentActivity.slice(0, 8).map((event) => (
                <div
                  key={event.id}
                  className="border-b border-[#d7e0ea] pb-2 text-xs text-[var(--c-body)]"
                >
                  <strong>{event.actorType}</strong> {event.action.replace(/_/g, " ")}
                  {event.targetType ? (
                    <span className="text-[var(--c-muted)]"> on {event.targetType}</span>
                  ) : null}
                  <span className="ml-1.5 text-[10px] text-[var(--c-muted)]">
                    {new Date(event.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
          </section>
        </div>
      }
    />
  );
}
