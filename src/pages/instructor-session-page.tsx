import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { BookOpen, CircleNotch, FloppyDisk, PushPin, Scales, Sparkle } from "@phosphor-icons/react";
import { useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { InstructorShell } from "@/components/layout/instructor-shell";
import { SynthesisArtifactCard } from "@/components/synthesis/synthesis-artifact-card";
import { PresenceBar } from "@/components/stream/presence-bar";
import { SubmissionCard } from "@/components/submission/submission-card";
import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { useInstructorOverview } from "@/hooks/use-instructor-overview";
import { categoryColorToTone } from "@/lib/category-colors";
import { inputPatternLabel, type InputPattern } from "@/lib/submission-telemetry";
import { routes } from "@/lib/routes";

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

export function InstructorSessionPage() {
  const { sessionSlug } = useParams({ from: "/instructor/session/$sessionSlug" });
  const overview = useInstructorOverview(sessionSlug);
  const triggerCategorisation = useMutation(api.categorisation.triggerForSession);
  const updatePhase = useMutation(api.instructorControls.updatePhase);
  const generateCategorySummary = useMutation(api.synthesis.generateCategorySummary);
  const generateClassSynthesis = useMutation(api.synthesis.generateClassSynthesis);
  const generateReports = useMutation(api.personalReports.generateForSession);
  const saveAsTemplate = useMutation(api.sessionTemplates.createFromSession);
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
  const [generatingCategoryId, setGeneratingCategoryId] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [embeddingQueued, setEmbeddingQueued] = useState(false);
  const [argMapQueued, setArgMapQueued] = useState(false);
  const [decidingRecatId, setDecidingRecatId] = useState<string | null>(null);

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

  async function handleRecategorisationDecision(args: {
    requestId: string;
    decision: "approved" | "rejected";
    categoryId?: string;
  }) {
    setDecidingRecatId(args.requestId);
    try {
      await decideRecategorisation({
        sessionSlug,
        requestId: args.requestId as Id<"recategorizationRequests">,
        decision: args.decision,
        categoryId: args.categoryId as Id<"categories"> | undefined,
      });
    } finally {
      setDecidingRecatId(null);
    }
  }

  async function handleGenerateCategorySummary(categoryId: string) {
    setGeneratingCategoryId(categoryId);
    try {
      await generateCategorySummary({ sessionSlug, categoryId: categoryId as any });
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
    setGeneratingReports(true);
    try {
      await generateReports({ sessionSlug });
    } finally {
      setGeneratingReports(false);
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
  const reportsSummary = reports?.summary;
  const recentReports = reports?.recent ?? [];

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
            <a href="#" className="text-xs text-[var(--c-link)]">
              + Add
            </a>
          </div>
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
              <div className="mt-1.5 flex flex-wrap gap-1">
                <span className="cursor-pointer rounded bg-[var(--c-surface-strong)] px-1.5 py-0.5 text-[9px]">
                  Rename
                </span>
                <span className="cursor-pointer rounded bg-[var(--c-surface-strong)] px-1.5 py-0.5 text-[9px]">
                  Split
                </span>
                <span className="cursor-pointer rounded bg-[var(--c-surface-strong)] px-1.5 py-0.5 text-[9px]">
                  <PushPin size={9} className="inline" />
                </span>
                <span className="cursor-pointer rounded bg-[var(--c-sig-slate)] px-1.5 py-0.5 text-[9px] text-white">
                  Follow-up
                </span>
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
                onClick={() => void triggerCategorisation({ sessionSlug })}
                className="mt-1.5 rounded bg-[var(--c-sig-yellow)] px-2 py-0.5 text-[10px] font-medium text-[var(--c-on-sig-light)]"
              >
                Run categorisation
              </button>
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
                <MetricTile label="Success" value={String((reportsSummary as any).success ?? 0)} />
                <MetricTile
                  label="Processing"
                  value={String(
                    ((reportsSummary as any).queued ?? 0) +
                      ((reportsSummary as any).processing ?? 0),
                  )}
                />
                <MetricTile label="Error" value={String((reportsSummary as any).error ?? 0)} />
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

            {recentReports.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] text-[var(--c-muted)]">Recent reports</p>
                {recentReports.slice(0, 6).map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between rounded-sm bg-[var(--c-surface-strong)] px-2 py-1.5"
                  >
                    <div className="flex gap-1">
                      {report.participationBand && (
                        <Badge tone="sky" className="text-[8px]">
                          {BAND_LABELS[report.participationBand] ?? report.participationBand}
                        </Badge>
                      )}
                      {report.reasoningBand && (
                        <Badge tone="peach" className="text-[8px]">
                          {BAND_LABELS[report.reasoningBand] ?? report.reasoningBand}
                        </Badge>
                      )}
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
                ))}
              </div>
            )}
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
                  {noveltyRadar.topDistinctive.slice(0, 5).map((item: any) => (
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
                  {noveltyRadar.categoryAverages.map((cat: any) => (
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
                      {categoryDrift.slices[0].categoryCounts.map((c: any) => (
                        <th key={c.categoryId} className="py-1 pr-2 font-medium">
                          {c.categoryName?.split(" ")[0]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categoryDrift.slices.map((slice: any) => (
                      <tr key={slice.key} className="border-b border-[var(--c-hairline)]">
                        <td className="py-1 pr-2 text-[var(--c-ink)]">{slice.label}</td>
                        {slice.categoryCounts.map((c: any) => (
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

          {/* Argument Map (card-based MVP) */}
          {semanticStatus?.readiness.canShowArgumentMap && argumentGraph && (
            <Card title="Argument Map">
              <div className="mb-2 flex gap-2 text-[10px] text-[var(--c-muted)]">
                <span>{argumentGraph.nodes.length} nodes</span>
                <span>{argumentGraph.edges.length} edges</span>
                {argumentGraph.layout?.suggestedRenderer && (
                  <Badge tone="neutral" className="text-[8px]">
                    {argumentGraph.layout.suggestedRenderer}
                  </Badge>
                )}
              </div>

              {argumentGraph.edges.slice(0, 10).map((edge: any) => {
                const src = argumentGraph.nodes.find((n: any) => n.nodeKey === edge.sourceKey);
                const tgt = argumentGraph.nodes.find((n: any) => n.nodeKey === edge.targetKey);
                return (
                  <div key={edge.id} className="mb-1.5 rounded-sm bg-[var(--c-surface-strong)] p-2">
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="font-medium text-[var(--c-ink)]">
                        {src?.label?.slice(0, 30) ?? edge.sourceKey}
                      </span>
                      <Badge
                        tone={
                          edge.linkType === "supports"
                            ? "success"
                            : edge.linkType === "contradicts"
                              ? "error"
                              : edge.linkType === "extends"
                                ? "sky"
                                : edge.linkType === "bridges"
                                  ? "mustard"
                                  : "neutral"
                        }
                        className="text-[8px]"
                      >
                        {edge.linkType}
                      </Badge>
                      <span className="font-medium text-[var(--c-ink)]">
                        {tgt?.label?.slice(0, 30) ?? edge.targetKey}
                      </span>
                    </div>
                    {edge.rationale && (
                      <p className="mt-0.5 text-[10px] text-[var(--c-muted)]">{edge.rationale}</p>
                    )}
                  </div>
                );
              })}
              {argumentGraph.edges.length > 10 && (
                <p className="mt-1 text-[10px] text-[var(--c-muted)]">
                  + {argumentGraph.edges.length - 10} more edges
                </p>
              )}
            </Card>
          )}
        </div>
      }
      right={
        <div className="grid gap-3">
          <p className="text-xs text-[var(--c-muted)]">Live Activity</p>
          {activity.length === 0 && (
            <p className="text-sm text-[var(--c-muted)]">No activity yet.</p>
          )}
          {activity.map((event) => (
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
