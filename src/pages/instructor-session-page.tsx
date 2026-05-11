import { useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { BookOpen, CircleNotch, Eye, FloppyDisk, Scales, Sparkle } from "@phosphor-icons/react";
import { useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { InstructorShell } from "@/components/layout/instructor-shell";
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
import { Switch } from "@/components/ui/switch";
import { useInstructorOverview } from "@/hooks/use-instructor-overview";
import { categoryColorToTone } from "@/lib/category-colors";
import { inputPatternLabel, type InputPattern } from "@/lib/submission-telemetry";
import { routes } from "@/lib/routes";
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

type VisibilityMode = "private_until_released" | "category_summary_only" | "raw_responses_visible";
type AnonymityMode = "nicknames_visible" | "anonymous_to_peers";
type CritiqueTone = "gentle" | "direct" | "spicy" | "roast";

interface SessionControlSnapshot {
  title: string;
  openingPrompt: string;
  phase: string;
  visibilityMode: VisibilityMode;
  anonymityMode: AnonymityMode;
  responseSoftLimitWords: number;
  categorySoftCap: number;
  critiqueToneDefault: CritiqueTone;
  telemetryEnabled: boolean;
  fightMeEnabled: boolean;
  summaryGateEnabled: boolean;
}

interface SessionSettingsUpdate {
  title: string;
  openingPrompt: string;
  anonymityMode: AnonymityMode;
  responseSoftLimitWords: number;
  categorySoftCap: number;
  critiqueToneDefault: CritiqueTone;
  telemetryEnabled: boolean;
  fightMeEnabled: boolean;
  summaryGateEnabled: boolean;
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

function getSessionControlsKey(session: SessionControlSnapshot) {
  return [
    session.title,
    session.openingPrompt,
    session.phase,
    session.visibilityMode,
    session.anonymityMode,
    session.responseSoftLimitWords,
    session.categorySoftCap,
    session.critiqueToneDefault,
    session.telemetryEnabled,
    session.fightMeEnabled,
    session.summaryGateEnabled,
  ].join("|");
}

const VISIBILITY_OPTIONS: Array<{
  value: VisibilityMode;
  label: string;
  description: string;
}> = [
  {
    value: "private_until_released",
    label: "Private",
    description: "Students see only their own work.",
  },
  {
    value: "category_summary_only",
    label: "Summaries",
    description: "Release themes and synthesis, but keep peer responses hidden.",
  },
  {
    value: "raw_responses_visible",
    label: "Responses",
    description: "Release peer responses and category summaries.",
  },
];

function SessionControlsCard({
  session,
  onVisibilityChange,
  onSettingsSave,
}: {
  session: SessionControlSnapshot;
  onVisibilityChange: (visibilityMode: VisibilityMode) => Promise<void>;
  onSettingsSave: (settings: SessionSettingsUpdate) => Promise<void>;
}) {
  const [title, setTitle] = useState(session.title);
  const [openingPrompt, setOpeningPrompt] = useState(session.openingPrompt);
  const [anonymityMode, setAnonymityMode] = useState<AnonymityMode>(session.anonymityMode);
  const [responseSoftLimitWords, setResponseSoftLimitWords] = useState(
    String(session.responseSoftLimitWords),
  );
  const [categorySoftCap, setCategorySoftCap] = useState(String(session.categorySoftCap));
  const [critiqueToneDefault, setCritiqueToneDefault] = useState<CritiqueTone>(
    session.critiqueToneDefault,
  );
  const [telemetryEnabled, setTelemetryEnabled] = useState(session.telemetryEnabled);
  const [fightMeEnabled, setFightMeEnabled] = useState(session.fightMeEnabled);
  const [summaryGateEnabled, setSummaryGateEnabled] = useState(session.summaryGateEnabled);
  const [savingVisibility, setSavingVisibility] = useState<VisibilityMode | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  async function handleVisibilityClick(visibilityMode: VisibilityMode) {
    setVisibilityError(null);
    setSavingVisibility(visibilityMode);
    try {
      await onVisibilityChange(visibilityMode);
    } catch (cause) {
      setVisibilityError(cause instanceof Error ? cause.message : "Could not update visibility.");
    } finally {
      setSavingVisibility(null);
    }
  }

  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSettingsError(null);
    setSettingsSaved(false);
    setSavingSettings(true);

    try {
      await onSettingsSave({
        title,
        openingPrompt,
        anonymityMode,
        responseSoftLimitWords: Number(responseSoftLimitWords),
        categorySoftCap: Number(categorySoftCap),
        critiqueToneDefault,
        telemetryEnabled,
        fightMeEnabled,
        summaryGateEnabled,
      });
      setSettingsSaved(true);
      window.setTimeout(() => setSettingsSaved(false), 2500);
    } catch (cause) {
      setSettingsError(cause instanceof Error ? cause.message : "Could not update settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  const inputClass =
    "min-h-10 w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 text-sm text-[var(--c-ink)] outline-none transition focus:border-[var(--c-info-border)]";

  return (
    <Card
      title="Session Controls"
      action={
        <Badge tone={session.visibilityMode === "private_until_released" ? "warning" : "success"}>
          {session.visibilityMode.replace(/_/g, " ")}
        </Badge>
      }
    >
      <div className="grid gap-5">
        {/* -- Visibility (instant effect) -- */}
        <div>
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <p className="font-display text-xs font-medium text-[var(--c-ink)]">
              Student visibility
            </p>
            <Badge tone="neutral" className="text-[10px]">
              {session.phase}
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {VISIBILITY_OPTIONS.map((option) => {
              const selected = session.visibilityMode === option.value;
              const saving = savingVisibility === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => void handleVisibilityClick(option.value)}
                  disabled={Boolean(savingVisibility)}
                  className={cn(
                    "rounded-md border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                    selected
                      ? "border-[var(--c-primary)] bg-[var(--c-sig-cream)]"
                      : "border-[var(--c-hairline)] bg-[var(--c-canvas)] hover:bg-[var(--c-surface-strong)]",
                  )}
                  style={selected ? { borderLeftWidth: 3 } : undefined}
                >
                  <span className="block font-display text-sm font-medium text-[var(--c-ink)]">
                    {saving ? "Saving..." : option.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-[var(--c-muted)]">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="primary"
              icon={<Eye size={14} />}
              onClick={() => void handleVisibilityClick("category_summary_only")}
              disabled={
                Boolean(savingVisibility) || session.visibilityMode === "category_summary_only"
              }
            >
              Release summaries
            </Button>
            <Button
              type="button"
              size="sm"
              variant="primary"
              icon={<Eye size={14} />}
              onClick={() => void handleVisibilityClick("raw_responses_visible")}
              disabled={
                Boolean(savingVisibility) || session.visibilityMode === "raw_responses_visible"
              }
            >
              Release responses
            </Button>
          </div>
          {visibilityError && (
            <p className="mt-2 text-xs text-[var(--c-error)]">{visibilityError}</p>
          )}
        </div>

        {/* -- Settings (save-on-submit) -- */}
        <form
          className="grid gap-4 border-t border-[var(--c-hairline)] pt-4"
          onSubmit={handleSettingsSubmit}
        >
          <p className="font-display text-xs font-medium text-[var(--c-ink)]">Configuration</p>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--c-muted)]">
                Session title
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block sm:w-36">
              <span className="mb-1 block text-[11px] font-medium text-[var(--c-muted)]">
                Critique tone
              </span>
              <select
                value={critiqueToneDefault}
                onChange={(event) => setCritiqueToneDefault(event.target.value as CritiqueTone)}
                className={inputClass}
              >
                <option value="gentle">Gentle</option>
                <option value="direct">Direct</option>
                <option value="spicy">Spicy</option>
                <option value="roast">Roast</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--c-muted)]">
              Opening prompt
            </span>
            <textarea
              value={openingPrompt}
              onChange={(event) => setOpeningPrompt(event.target.value)}
              rows={2}
              className="w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm leading-relaxed text-[var(--c-ink)] outline-none transition focus:border-[var(--c-info-border)]"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--c-muted)]">
                Word limit
              </span>
              <input
                type="number"
                min={20}
                max={1000}
                value={responseSoftLimitWords}
                onChange={(event) => setResponseSoftLimitWords(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--c-muted)]">
                Category cap
              </span>
              <input
                type="number"
                min={2}
                max={40}
                value={categorySoftCap}
                onChange={(event) => setCategorySoftCap(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--c-muted)]">
                Anonymity
              </span>
              <select
                value={anonymityMode}
                onChange={(event) => setAnonymityMode(event.target.value as AnonymityMode)}
                className={inputClass}
              >
                <option value="nicknames_visible">Nicknames visible</option>
                <option value="anonymous_to_peers">Anonymous to peers</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={fightMeEnabled} onCheckedChange={setFightMeEnabled} label="" />
              <span className="text-xs text-[var(--c-ink)]">Fight Me</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={summaryGateEnabled}
                onCheckedChange={setSummaryGateEnabled}
                label=""
              />
              <span className="text-xs text-[var(--c-ink)]">Summary gate</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={telemetryEnabled} onCheckedChange={setTelemetryEnabled} label="" />
              <span className="text-xs text-[var(--c-ink)]">Telemetry</span>
            </div>
          </div>

          {settingsError && <p className="text-xs text-[var(--c-error)]">{settingsError}</p>}
          <div className="flex items-center justify-end gap-3">
            {settingsSaved && (
              <span className="text-xs text-[var(--c-success)]">Saved</span>
            )}
            <Button type="submit" size="sm" disabled={savingSettings}>
              <FloppyDisk size={14} className="mr-1.5" />
              {savingSettings ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}

export function InstructorSessionPage() {
  const { sessionSlug } = useParams({ from: "/instructor/session/$sessionSlug" });
  const overview = useInstructorOverview(sessionSlug);
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

  const semanticStatus = useQuery(api.semantic.getSemanticStatus, { sessionSlug });
  const noveltyRadar = useQuery(api.semantic.getNoveltyRadar, { sessionSlug });
  const categoryDrift = useQuery(api.semantic.getCategoryDrift, { sessionSlug });
  const argumentGraph = useQuery(api.argumentMap.getVisualizationGraph, { sessionSlug });

  const queueEmbeddings = useMutation(api.semantic.queueEmbeddingsForSession);
  const refreshSignals = useMutation(api.semantic.refreshSignalsForSession);
  const generateArgMap = useMutation(api.argumentMap.generateForSession);

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
    recentSubmissions,
    activity,
    followUps,
    synthesis,
    reports,
  } = overview;

  const joinPath = routes.join(session.joinCode);
  const joinUrl =
    typeof window === "undefined" ? joinPath : new URL(joinPath, window.location.origin).toString();

  const patternCounts = responses.inputPatterns as Record<InputPattern, number>;
  const activeCategories = categories;
  const categoryById = new Map(activeCategories.map((category) => [category.id, category]));

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
        await generateClassSynthesis({ sessionSlug, kind: "opposing_views" });
      } finally {
        setGeneratingOpposing(false);
      }
    } else {
      setGeneratingClass(true);
      try {
        await generateClassSynthesis({ sessionSlug });
      } finally {
        setGeneratingClass(false);
      }
    }
  }

  async function handleGenerateReports() {
    setReportGenerationError(null);
    setGeneratingReports(true);
    try {
      await generateReports({ sessionSlug });
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
      const job = await triggerCategorisation({ sessionSlug });
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
      await queueEmbeddings({ sessionSlug });
    } finally {
      setEmbeddingQueued(false);
    }
  }

  async function handleGenerateArgMap() {
    setArgMapQueued(true);
    try {
      await generateArgMap({ sessionSlug });
    } finally {
      setArgMapQueued(false);
    }
  }

  const artifactCounts = synthesis?.artifactCounts;
  const recentArtifacts = synthesis?.recentArtifacts ?? [];
  const latestClassSynthesis = synthesis?.latestClassSynthesis;
  const reportsSummary = reports?.summary as PersonalReportsSummary | undefined;
  const recentReports = reports?.recent ?? [];
  const latestCategorisationJob = overview.jobs.latest.find((job) => job.type === "categorisation");
  const categorisationBusy =
    triggeringCategorisation ||
    latestCategorisationJob?.status === "queued" ||
    latestCategorisationJob?.status === "processing";
  const studentActivity = activity.filter((event) => event.actorType === "participant");

  return (
    <InstructorShell
      sessionTitle={session.title}
      sessionCode={session.joinCode}
      participantCount={session.participantCount}
      actIndex={PHASE_ORDER.indexOf(session.phase as Phase) - 1}
      onPreviousAct={retreatPhase}
      onNextAct={advancePhase}
      left={
        <div className="grid gap-3">
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
      }
      center={
        <div className="grid gap-3">
          <SessionControlsCard
            key={getSessionControlsKey(session)}
            session={session}
            onVisibilityChange={handleVisibilityChange}
            onSettingsSave={handleSettingsSave}
          />

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <MetricTile label="Submitted" value={String(responses.total)} />
            <MetricTile label="Categories" value={String(activeCategories.length)} />
            <MetricTile label="Recat Req" value={String(recategorisation.pendingCount)} />
            <MetricTile label="Follow-ups" value={String(followUps.activeCount)} />
          </div>

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
            submitted={presence.submitted}
            idle={presence.idle}
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
              disabled={generatingReports}
            >
              {generatingReports ? (
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

          {/* Semantic Analysis */}
          <Card title="Semantic Analysis">
            {semanticStatus && (
              <div className="mb-3 grid grid-cols-3 gap-2">
                <MetricTile label="Embeddings" value={String(semanticStatus.embeddingCount)} />
                <MetricTile label="Signals" value={String(semanticStatus.signalCount)} />
                <MetricTile label="Arg Links" value={String(semanticStatus.argumentLinkCount)} />
              </div>
            )}

            {semanticStatus?.readiness.missingPrerequisites.length
              ? semanticStatus.readiness.missingPrerequisites.length > 0 && (
                  <div className="mb-3 rounded-md bg-[var(--c-surface-soft)] p-2">
                    <p className="text-[10px] font-medium text-[var(--c-sig-mustard)]">
                      Missing prerequisites:
                    </p>
                    {semanticStatus.readiness.missingPrerequisites.map((p) => (
                      <p key={p} className="text-[10px] text-[var(--c-muted)]">
                        • {p}
                      </p>
                    ))}
                  </div>
                )
              : null}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={handleQueueEmbeddings}
                disabled={embeddingQueued}
              >
                {embeddingQueued ? (
                  <>
                    <CircleNotch size={12} className="mr-1 inline animate-spin" />
                    Queued
                  </>
                ) : (
                  "Generate Embeddings"
                )}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => void refreshSignals({ sessionSlug })}
              >
                Refresh Signals
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={handleGenerateArgMap}
                disabled={argMapQueued}
              >
                {argMapQueued ? (
                  <>
                    <CircleNotch size={12} className="mr-1 inline animate-spin" />
                    Queued
                  </>
                ) : (
                  "Argument Map"
                )}
              </Button>
            </div>
          </Card>

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
      }
      right={
        <div className="grid gap-3">
          <p className="text-xs text-[var(--c-muted)]">Live Activity</p>
          {studentActivity.length === 0 && (
            <p className="text-sm text-[var(--c-muted)]">No student activity yet.</p>
          )}
          {studentActivity.map((event) => (
            <div
              key={event.id}
              className="border-b border-[var(--c-hairline)] pb-2 text-xs text-[var(--c-body)]"
            >
              <span
                className="mr-1.5 inline-block h-2 w-2 rounded-full"
                style={{
                  background: event.action.includes("synthesis")
                    ? "var(--c-sig-peach)"
                    : event.action.includes("report")
                      ? "var(--c-success)"
                      : event.action.includes("fight")
                        ? "var(--c-sig-coral)"
                        : event.action.includes("recat")
                          ? "var(--c-sig-yellow)"
                          : event.action.includes("follow")
                            ? "var(--c-sig-peach)"
                            : "var(--c-sig-sky)",
                }}
              />
              <strong>{event.actorType}</strong> {event.action.replace(/_/g, " ")}
              {event.targetType && (
                <span className="text-[var(--c-muted)]"> on {event.targetType}</span>
              )}
              <span className="ml-1.5 text-[10px] text-[var(--c-muted)]">
                {new Date(event.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}

          {/* Synthesis Artifacts */}
          {recentArtifacts.length > 0 && (
            <>
              <p className="mt-3 text-xs text-[var(--c-muted)]">Synthesis Artifacts</p>
              {recentArtifacts.map((artifact) => (
                <SynthesisArtifactCard
                  key={artifact.id}
                  artifact={artifact}
                  sessionSlug={sessionSlug}
                  isInstructor
                />
              ))}
            </>
          )}
        </div>
      }
    />
  );
}
