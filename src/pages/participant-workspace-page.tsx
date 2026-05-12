import { useEffect, useMemo, useRef, useState, type ComponentProps, type FormEvent } from "react";
import { ChartBar, CircleNotch } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ContributionThreadCard } from "@/components/contribute/contribution-thread-card";
import { FightHome } from "@/components/fight/fight-home";
import { FightThread } from "@/components/fight/fight-thread";
import { ParticipantShell } from "@/components/layout/participant-shell";
import { ParticipantStateSection } from "@/components/layout/participant-state-section";
import { MyZoneTab } from "@/components/myzone/my-zone-tab";
import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";
import { PresenceBar } from "@/components/stream/presence-bar";
import { StreamTab } from "@/components/stream/stream-tab";
import {
  ResponseComposer,
  type ResponseComposerSubmit,
} from "@/components/submission/response-composer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { MetricTile } from "@/components/ui/metric-tile";
import { useParticipantWorkspace } from "@/hooks/use-participant-workspace";
import {
  getOrCreateClientKey,
  isDemoClientKey,
  restoreOriginalClientKey,
  setDemoClientKey,
  storeParticipant,
} from "@/lib/client-identity";
import { DEMO_SESSION_SLUG, TABS, type TabId } from "@/lib/constants";
import { routes } from "@/lib/routes";

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

interface ParticipantWorkspacePageProps {
  sessionSlug: string;
  initialTab?: TabId;
  fightSlug?: string;
  showReviewDetail?: boolean;
}

interface PersonalReportView {
  status: "queued" | "processing" | "error" | "success";
  participationBand?: string | null;
  reasoningBand?: string | null;
  originalityBand?: string | null;
  responsivenessBand?: string | null;
  summary?: string | null;
  contributionTrace?: string | null;
  argumentEvolution?: string | null;
  growthOpportunity?: string | null;
  generatedAt?: number | null;
  error?: string | null;
}

function parseParticipantTab(value: string | null): TabId | null {
  if (!value) return null;
  return TABS.some((tab) => tab.id === value) ? (value as TabId) : null;
}

export function ParticipantWorkspacePage({
  sessionSlug,
  initialTab = "contribute",
  fightSlug,
  showReviewDetail = false,
}: ParticipantWorkspacePageProps) {
  const navigate = useNavigate();
  const requestedTab = parseParticipantTab(new URLSearchParams(window.location.search).get("tab"));
  const clientKey = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const demoClientKey = searchParams.get("demoClientKey");
    const tab = parseParticipantTab(searchParams.get("tab"));

    if (sessionSlug === DEMO_SESSION_SLUG && demoClientKey?.startsWith("demo-")) {
      setDemoClientKey(demoClientKey);
      window.history.replaceState(null, "", routes.sessionTab(sessionSlug, tab ?? "contribute"));
    }

    if (sessionSlug !== DEMO_SESSION_SLUG && isDemoClientKey()) {
      restoreOriginalClientKey();
    }

    return getOrCreateClientKey();
  }, [sessionSlug]);

  const [selectedQuestionOverrideId, setSelectedQuestionOverrideId] = useState<
    Id<"sessionQuestions"> | null
  >(null);
  const workspace = useParticipantWorkspace(sessionSlug, clientKey, selectedQuestionOverrideId);

  const session = useQuery(api.sessions.getBySlug, { sessionSlug });
  const participant = useQuery(
    api.participants.restore,
    clientKey ? { sessionSlug, clientKey } : "skip",
  );
  const positionShifts = useQuery(
    api.positionShifts.listMine,
    clientKey ? { sessionSlug, clientKey } : "skip",
  );
  const report = useQuery(
    api.personalReports.getMine,
    clientKey && showReviewDetail ? { sessionSlug, clientKey } : "skip",
  );

  const updateNickname = useMutation(api.participants.updateNickname);
  const touchPresence = useMutation(api.participants.touchPresence);
  const submitAndQueue = useMutation(api.participantWorkspace.submitAndQueueFeedback);
  const createSubmission = useMutation(api.submissions.create);
  const retryFeedback = useMutation(api.aiFeedback.retryFailed);
  const requestRecategorisation = useMutation(api.recategorisation.request);
  const generateReport = useMutation(api.personalReports.generateMine);

  const [nicknameDraft, setNicknameDraft] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [feedbackQueueWarning, setFeedbackQueueWarning] = useState<string | null>(null);
  const [followUpParentId, setFollowUpParentId] = useState<Id<"submissions"> | null>(null);
  const [showAdditionalComposer, setShowAdditionalComposer] = useState(false);
  const [expandedContributionId, setExpandedContributionId] = useState<Id<"submissions"> | null>(
    null,
  );
  const [retryingFeedbackSubmissionId, setRetryingFeedbackSubmissionId] =
    useState<Id<"submissions"> | null>(null);
  const routeDrivenTab: TabId | null = fightSlug ? "fight" : showReviewDetail ? "me" : null;
  const [localActiveTab, setLocalActiveTab] = useState<TabId>(requestedTab ?? initialTab);
  const activeTab = routeDrivenTab ?? localActiveTab;
  const [generatingReport, setGeneratingReport] = useState(false);
  const touchedPresenceKey = useRef<string | null>(null);

  useEffect(() => {
    if (!participant || !clientKey) return;

    storeParticipant({
      sessionSlug,
      participantSlug: participant.participantSlug,
      nickname: participant.nickname,
    });
    const presenceKey = `${sessionSlug}:${participant.participantSlug}:${clientKey}`;
    if (touchedPresenceKey.current === presenceKey) return;
    touchedPresenceKey.current = presenceKey;
    void touchPresence({ sessionSlug, clientKey, presenceState: "idle" });
  }, [clientKey, participant, sessionSlug, touchPresence]);

  const nickname = nicknameDraft ?? participant?.nickname ?? "";

  async function handleNicknameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!participant || !clientKey) return;
    setNicknameError(null);
    try {
      const updated = await updateNickname({
        sessionSlug,
        participantSlug: participant.participantSlug,
        nickname,
        clientKey,
      });
      storeParticipant({
        sessionSlug,
        participantSlug: updated.participantSlug,
        nickname: updated.nickname,
      });
    } catch (cause) {
      setNicknameError(cause instanceof Error ? cause.message : "Could not update nickname.");
    }
  }

  async function handleSubmit(sub: ResponseComposerSubmit) {
    if (!clientKey) return;
    setSubmissionError(null);
    setFeedbackQueueWarning(null);
    try {
      const result = await submitAndQueue({
        sessionSlug,
        clientKey,
        body: sub.body,
        questionId: workspace?.selectedQuestion?.id,
        kind: "initial",
        tone: (sub.tone as "gentle" | "direct" | "spicy" | "roast") ?? undefined,
        telemetry: sub.telemetry,
      });
      if (!result.feedbackQueued) {
        setFeedbackQueueWarning(
          result.feedbackQueueError ?? "Your response was saved, but AI feedback could not be queued.",
        );
      }
    } catch (cause) {
      setSubmissionError(cause instanceof Error ? cause.message : "Could not submit response.");
      throw cause;
    }
  }

  async function handleAddAnotherPoint(sub: ResponseComposerSubmit) {
    if (!clientKey) return;
    setSubmissionError(null);
    setFeedbackQueueWarning(null);
    try {
      const result = await submitAndQueue({
        sessionSlug,
        clientKey,
        body: sub.body,
        questionId: workspace?.selectedQuestion?.id,
        kind: "additional_point",
        tone: (sub.tone as "gentle" | "direct" | "spicy" | "roast") ?? undefined,
        telemetry: sub.telemetry,
      });
      if (!result.feedbackQueued) {
        setFeedbackQueueWarning(
          result.feedbackQueueError ?? "Your response was saved, but AI feedback could not be queued.",
        );
      }
      setShowAdditionalComposer(false);
    } catch (cause) {
      setSubmissionError(cause instanceof Error ? cause.message : "Could not add another point.");
      throw cause;
    }
  }

  async function handleFollowUp(sub: ResponseComposerSubmit, parentId: Id<"submissions">) {
    if (!clientKey) return;
    setSubmissionError(null);
    try {
      await createSubmission({
        sessionSlug,
        clientKey,
        body: sub.body,
        questionId: workspace?.selectedQuestion?.id,
        kind: "additional_point",
        parentSubmissionId: parentId,
        telemetry: sub.telemetry,
      });
      setFollowUpParentId(null);
    } catch (cause) {
      setSubmissionError(cause instanceof Error ? cause.message : "Could not submit follow-up.");
      throw cause;
    }
  }

  async function handleRetryFeedback(submissionId: Id<"submissions">) {
    if (!clientKey) return;
    setFeedbackQueueWarning(null);
    setRetryingFeedbackSubmissionId(submissionId);
    try {
      await retryFeedback({
        sessionSlug,
        clientKey,
        submissionId,
      });
    } catch (cause) {
      setFeedbackQueueWarning(
        cause instanceof Error ? cause.message : "Could not retry feedback generation.",
      );
    } finally {
      setRetryingFeedbackSubmissionId(null);
    }
  }

  async function handleRequestRecategorisation(
    submissionId: Id<"submissions">,
    request: {
      requestedCategoryId?: Id<"categories">;
      suggestedCategoryName?: string;
      reason: string;
    },
  ) {
    if (!clientKey) {
      throw new Error("No submitted response is available for recategorisation.");
    }

    await requestRecategorisation({
      sessionSlug,
      clientKey,
      submissionId,
      requestedCategoryId: request.requestedCategoryId,
      suggestedCategoryName: request.suggestedCategoryName,
      reason: request.reason,
    });
  }

  async function handleGenerateReport() {
    if (!clientKey || generatingReport) return;
    setGeneratingReport(true);
    try {
      await generateReport({ sessionSlug, clientKey });
    } finally {
      setGeneratingReport(false);
    }
  }

  function handleTabChange(nextTab: TabId) {
    setLocalActiveTab(nextTab);
    void navigate({
      to: routes.sessionTab(sessionSlug, nextTab),
    });
  }

  if (session === undefined || participant === undefined || (showReviewDetail && report === undefined)) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
        <LoadingState
          label={showReviewDetail ? "Loading your report..." : "Loading session..."}
          className="w-full max-w-md"
        />
      </main>
    );
  }

  if (session === null) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
        <ErrorState
          title="Session not found"
          description="This readable session URL does not match an existing session."
        />
      </main>
    );
  }

  if (participant === null) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
        <Card title="Join required" eyebrow={session.joinCode} className="w-full max-w-md">
          <p className="text-sm text-[var(--c-muted)]">
            This browser does not have a participant identity for {session.title}.
          </p>
          <Button
            type="button"
            className="mt-4 w-full"
            onClick={() => void navigate({ to: routes.join(session.joinCode) })}
          >
            Join with nickname
          </Button>
        </Card>
      </main>
    );
  }

  const ws = workspace;
  const selectedQuestion = ws?.selectedQuestion ?? ws?.currentQuestion ?? null;
  const releasedQuestions =
    ws?.releasedQuestionsOrdered ??
    (ws?.questions ?? []).filter((question) => question.status === "released");
  const matchesSelectedQuestion = (questionId?: Id<"sessionQuestions"> | null) =>
    !selectedQuestion?.id || questionId === selectedQuestion.id;

  const myThreads = ws?.myThreads ?? [];
  const nonInitialResponses =
    ws?.myZoneHistory.followUpResponses.filter((submission) =>
      matchesSelectedQuestion(submission.questionId),
    ) ?? [];
  const topLevelContributions = myThreads.map((thread) => thread.root.submission);
  const followUpResponses = nonInitialResponses.filter(
    (submission) => Boolean(submission.parentSubmissionId) || Boolean(submission.followUpPromptId),
  );

  const scopedSubmissionIds = new Set(
    [...topLevelContributions, ...followUpResponses].map((submission) => submission.id),
  );
  const scopedFeedback =
    ws?.feedbackBySubmission.filter((feedback) => scopedSubmissionIds.has(feedback.submissionId)) ??
    [];
  const scopedAssignments =
    ws?.assignmentsBySubmission.filter((assignment) =>
      matchesSelectedQuestion(assignment.questionId),
    ) ?? [];
  const scopedRecategorisationRequests =
    ws?.recategorisationRequests.filter((request) => matchesSelectedQuestion(request.questionId)) ??
    [];

  const primaryContribution = topLevelContributions[0] ?? null;
  const activeExpandedContributionId = topLevelContributions.some(
    (submission) => submission.id === expandedContributionId,
  )
    ? expandedContributionId
    : null;

  const canSeeCategorySummary =
    selectedQuestion?.categoryBoardVisible ??
    selectedQuestion?.categorySummariesVisible ??
    ws?.visibility.canSeeCategorySummary ??
    false;
  const canSeeRawPeerResponses =
    selectedQuestion?.peerResponsesVisible ?? ws?.visibility.canSeeRawPeerResponses ?? false;
  const synthesisArtifacts = [
    ...(ws?.synthesis.publishedArtifacts ?? []),
    ...(ws?.synthesis.finalArtifacts ?? []),
  ];
  const canUseFight =
    selectedQuestion?.fightEnabled ?? (ws?.session.fightMeEnabled ?? session.fightMeEnabled);
  const contributionsOpen = selectedQuestion?.contributionsOpen ?? true;
  const repliesEnabled = selectedQuestion?.repliesEnabled ?? false;
  const upvotesEnabled = selectedQuestion?.upvotesEnabled ?? false;
  const canUseFightMe = Boolean(clientKey && primaryContribution && canUseFight);
  const selectedPrompt = selectedQuestion?.prompt ?? session.openingPrompt;

  const followUpComposer = followUpParentId ? (
    <Card
      title="Add follow-up"
      action={
        <Button type="button" variant="ghost" size="sm" onClick={() => setFollowUpParentId(null)}>
          Cancel
        </Button>
      }
    >
      {submissionError ? <InlineAlert tone="error">{submissionError}</InlineAlert> : null}
      <ResponseComposer
        softWordLimit={session.responseSoftLimitWords}
        submitLabel="Add follow-up"
        placeholder="Add a clarification or extra point..."
        onSubmit={(_text, _tone, submission) => handleFollowUp(submission, followUpParentId)}
      />
    </Card>
  ) : null;

  const promptLabel = selectedQuestion?.isCurrent ? "Current question" : "Released question";

  return (
    <ParticipantShell
      sessionTitle={session.title}
      joinCode={session.joinCode}
      nickname={participant.nickname}
      sessionSlug={sessionSlug}
      prompt={selectedPrompt}
      promptLabel={promptLabel}
      capabilities={{
        contributionsOpen,
        hasContributions: topLevelContributions.length > 0,
        canSeeRawPeerResponses,
        canSeeCategorySummary,
        synthesisVisible: selectedQuestion?.synthesisVisible ?? false,
        fightEnabled: canUseFight,
        personalReportsVisible: selectedQuestion?.personalReportsVisible ?? false,
      }}
      releasedQuestions={releasedQuestions.map((q) => ({
        id: q.id,
        title: q.title,
        isCurrent: q.isCurrent,
      }))}
      selectedQuestionId={selectedQuestion?.id ?? null}
      onSelectQuestion={(questionId) =>
        setSelectedQuestionOverrideId(
          questionId as typeof selectedQuestionOverrideId,
        )
      }
      activeTab={activeTab}
      onActiveTabChange={handleTabChange}
      contribute={
        <div className="grid gap-4">
          {submissionError ? <InlineAlert tone="error">{submissionError}</InlineAlert> : null}
          {feedbackQueueWarning ? (
            <InlineAlert tone="warning">
              {feedbackQueueWarning} Open analysis on the saved contribution to retry feedback.
            </InlineAlert>
          ) : null}

          {!contributionsOpen && topLevelContributions.length === 0 ? (
            <ParticipantStateSection kind="locked" title="Contributions paused">
              This question is browseable, but new contributions are closed until the instructor
              reopens it.
            </ParticipantStateSection>
          ) : null}

          <div className="flex flex-col gap-2 rounded-lg border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3 sm:flex-row sm:items-center sm:justify-between">
            <PresenceBar
              typing={ws?.presenceAggregate.typing ?? 0}
              submitted={ws?.presenceAggregate.submitted ?? 0}
              idle={ws?.presenceAggregate.idle ?? 0}
              className="border-none bg-transparent p-0"
            />
            {contributionsOpen && topLevelContributions.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowAdditionalComposer((value) => !value)}
              >
                {showAdditionalComposer ? "Cancel" : "Add another point"}
              </Button>
            ) : !contributionsOpen ? (
              <p className="text-xs text-[var(--c-muted)]">New contributions are paused.</p>
            ) : (
              <p className="text-xs text-[var(--c-muted)]">Add your first response below.</p>
            )}
          </div>

          {topLevelContributions.length === 0 ? (
            <ResponseComposer
              softWordLimit={session.responseSoftLimitWords}
              submitLabel="Submit response"
              onSubmit={(_text, _tone, submission) => handleSubmit(submission)}
            />
          ) : showAdditionalComposer ? (
            <ResponseComposer
              softWordLimit={session.responseSoftLimitWords}
              submitLabel="Add another point"
              placeholder="Add another angle, example, or challenge..."
              onSubmit={(_text, _tone, submission) => handleAddAnotherPoint(submission)}
            />
          ) : null}

          {myThreads.length > 0 ? (
            <div className="grid gap-3">
              {myThreads.map((thread, index) => {
                const submission = thread.root.submission;

                return (
                  <ContributionThreadCard
                    key={submission.id}
                    submission={submission}
                    feedback={thread.feedbackSummary}
                    assignment={thread.assignment}
                    categories={ws?.categorySummary}
                    followUps={thread.replies.map((reply) => ({
                      id: reply.submission.id,
                      body: reply.submission.body,
                      createdAt: reply.submission.createdAt,
                      followUpTitle: reply.submission.kind === "reply" ? "Reply" : "Follow-up",
                    }))}
                    recategorisationRequest={thread.recategorisationRequest}
                    expanded={activeExpandedContributionId === submission.id}
                    isLatest={index === 0}
                    onToggleExpanded={() =>
                      setExpandedContributionId((current) =>
                        current === submission.id ? null : submission.id,
                      )
                    }
                    onRequestRecategorisation={(request) =>
                      handleRequestRecategorisation(submission.id, request)
                    }
                    onAddFollowUp={() => setFollowUpParentId(submission.id)}
                    onRetryFeedback={() => handleRetryFeedback(submission.id)}
                    feedbackRetrying={retryingFeedbackSubmissionId === submission.id}
                  >
                    {followUpParentId === submission.id ? followUpComposer : null}
                  </ContributionThreadCard>
                );
              })}
            </div>
          ) : null}
        </div>
      }
      explore={
        <div className="grid gap-4">
          <StreamTab
            peerResponses={ws?.recentPeerResponses}
            peerThreads={ws?.peerThreads}
            peerThreadsByCategory={ws?.peerThreadsByCategory}
            categories={ws?.categorySummary}
            synthesisArtifacts={synthesisArtifacts}
            synthesisView={ws?.synthesisView}
            synthesisVisible={selectedQuestion?.synthesisVisible ?? false}
            synthesisBlockedBySession={session.visibilityMode === "private_until_released"}
            canSeeRawPeerResponses={canSeeRawPeerResponses}
            canSeeCategorySummary={canSeeCategorySummary}
            repliesEnabled={repliesEnabled}
            upvotesEnabled={upvotesEnabled}
            fightEnabled={canUseFight}
            selectedQuestionId={selectedQuestion?.id}
            softWordLimit={session.responseSoftLimitWords}
            sessionSlug={sessionSlug}
            clientKey={clientKey}
            mySubmissionId={primaryContribution?.id}
            onFightCreated={(nextFightSlug) =>
              void navigate({ to: routes.sessionFight(sessionSlug, nextFightSlug) })
            }
          />
        </div>
      }
      fight={
        <FightTabContent
          sessionSlug={sessionSlug}
          clientKey={clientKey}
          myParticipantId={participant.id}
          myFights={ws?.fightMe.mine ?? []}
          pendingIncoming={ws?.fightMe.pendingIncoming ?? []}
          currentFight={ws?.fightMe.current ?? null}
          fightMeEnabled={ws?.session.fightMeEnabled ?? session.fightMeEnabled}
          mySubmissionId={primaryContribution?.id}
          canUseFight={canUseFight}
          canUseFightMe={canUseFightMe}
          fightSlug={fightSlug}
          onNavigateToThread={(nextFightSlug) =>
            void navigate({ to: routes.sessionFight(sessionSlug, nextFightSlug) })
          }
          onNavigateToTab={handleTabChange}
        />
      }
      me={
        <MeTabContent
          showReviewDetail={showReviewDetail}
          report={report ?? null}
          generatingReport={generatingReport}
          onGenerateReport={handleGenerateReport}
          initialResponses={topLevelContributions}
          followUpResponses={followUpResponses}
          feedbackBySubmission={scopedFeedback}
          assignmentsBySubmission={scopedAssignments}
          recategorisationRequests={scopedRecategorisationRequests}
          fightThreads={ws?.fightMe.mine}
          positionShifts={positionShifts ?? undefined}
          personalReport={ws?.personalReport}
          personalReportsVisible={selectedQuestion?.personalReportsVisible ?? false}
          loading={ws === undefined}
          onViewFight={(nextFightSlug) =>
            void navigate({ to: routes.sessionFight(sessionSlug, nextFightSlug) })
          }
          onViewReport={() => void navigate({ to: routes.sessionReview(sessionSlug) })}
          nickname={nickname}
          nicknameError={nicknameError ?? undefined}
          onNicknameChange={(value) => setNicknameDraft(value)}
          onNicknameSubmit={handleNicknameSubmit}
        />
      }
    />
  );
}

interface FightTabContentProps {
  sessionSlug: string;
  clientKey: string;
  myParticipantId: string;
  myFights: NonNullable<ReturnType<typeof useParticipantWorkspace>>["fightMe"]["mine"];
  pendingIncoming: NonNullable<ReturnType<typeof useParticipantWorkspace>>["fightMe"]["pendingIncoming"];
  currentFight: NonNullable<ReturnType<typeof useParticipantWorkspace>>["fightMe"]["current"];
  fightMeEnabled: boolean;
  mySubmissionId?: Id<"submissions">;
  canUseFight: boolean;
  canUseFightMe: boolean;
  fightSlug?: string;
  onNavigateToThread: (fightSlug: string) => void;
  onNavigateToTab?: (tab: TabId) => void;
}

function FightTabContent({
  sessionSlug,
  clientKey,
  myParticipantId,
  myFights,
  pendingIncoming,
  currentFight,
  fightMeEnabled,
  mySubmissionId,
  canUseFight,
  canUseFightMe,
  fightSlug,
  onNavigateToThread,
  onNavigateToTab,
}: FightTabContentProps) {
  if (fightSlug) {
    return (
      <FightThread
        sessionSlug={sessionSlug}
        fightSlug={fightSlug}
        clientKey={clientKey}
        myParticipantId={myParticipantId}
      />
    );
  }

  if (canUseFightMe) {
    return (
      <FightHome
        myFights={myFights}
        pendingIncoming={pendingIncoming}
        currentFight={currentFight}
        fightMeEnabled={fightMeEnabled}
        sessionSlug={sessionSlug}
        clientKey={clientKey}
        mySubmissionId={mySubmissionId}
        onNavigateToThread={onNavigateToThread}
      />
    );
  }

  if (canUseFight) {
    return (
      <ParticipantStateSection
        kind="empty"
        title="Ready to fight"
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onNavigateToTab?.("contribute")}
          >
            Go to Contribute
          </Button>
        }
      >
        Submit a response before you can open a Fight thread.
      </ParticipantStateSection>
    );
  }

  return (
    <ParticipantStateSection kind="locked" title="Fight">
      The instructor has not enabled Fight for this question yet.
    </ParticipantStateSection>
  );
}

interface MeTabContentProps {
  showReviewDetail: boolean;
  report: PersonalReportView | null;
  generatingReport: boolean;
  onGenerateReport: () => Promise<void>;
  initialResponses: NonNullable<ReturnType<typeof useParticipantWorkspace>>["myZoneHistory"]["initialResponses"];
  followUpResponses: NonNullable<ReturnType<typeof useParticipantWorkspace>>["myZoneHistory"]["followUpResponses"];
  feedbackBySubmission: NonNullable<ReturnType<typeof useParticipantWorkspace>>["feedbackBySubmission"];
  assignmentsBySubmission: NonNullable<ReturnType<typeof useParticipantWorkspace>>["assignmentsBySubmission"];
  recategorisationRequests: NonNullable<ReturnType<typeof useParticipantWorkspace>>["recategorisationRequests"];
  fightThreads?: ComponentProps<typeof MyZoneTab>["fightThreads"];
  positionShifts?: ComponentProps<typeof MyZoneTab>["positionShifts"];
  personalReport?: ComponentProps<typeof MyZoneTab>["personalReport"];
  personalReportsVisible: boolean;
  loading: boolean;
  onViewFight: (fightSlug: string) => void;
  onViewReport: () => void;
  nickname: string;
  nicknameError?: string;
  onNicknameChange: (value: string) => void;
  onNicknameSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

function MeTabContent({
  showReviewDetail,
  report,
  generatingReport,
  onGenerateReport,
  initialResponses,
  followUpResponses,
  feedbackBySubmission,
  assignmentsBySubmission,
  recategorisationRequests,
  fightThreads,
  positionShifts,
  personalReport,
  personalReportsVisible,
  loading,
  onViewFight,
  onViewReport,
  nickname,
  nicknameError,
  onNicknameChange,
  onNicknameSubmit,
}: MeTabContentProps) {
  if (showReviewDetail) {
    return (
      <ReviewDetail report={report} generating={generatingReport} onGenerate={onGenerateReport} />
    );
  }

  return (
    <div className="grid gap-4">
      <MyZoneTab
        initialResponses={initialResponses}
        followUpResponses={followUpResponses}
        feedbackBySubmission={feedbackBySubmission}
        assignmentsBySubmission={assignmentsBySubmission}
        recategorisationRequests={recategorisationRequests}
        fightThreads={fightThreads}
        positionShifts={positionShifts}
        personalReport={personalReport}
        personalReportsVisible={personalReportsVisible}
        loading={loading}
        onViewFight={onViewFight}
        onViewReport={onViewReport}
      />
      <Card eyebrow="Settings">
        <form className="grid gap-3" onSubmit={(event) => void onNicknameSubmit(event)}>
          <Input
            label="Visible nickname"
            value={nickname}
            onChange={(event) => onNicknameChange(event.target.value)}
            error={nicknameError}
          />
          <Button type="submit" variant="ghost" size="sm">
            Update nickname
          </Button>
        </form>
      </Card>
    </div>
  );
}

interface ReviewDetailProps {
  report: PersonalReportView | null;
  generating: boolean;
  onGenerate: () => Promise<void>;
}

function ReviewDetail({ report, generating, onGenerate }: ReviewDetailProps) {
  if (report === null) {
    return (
      <div className="grid place-items-center gap-4 py-8">
        <ChartBar size={32} className="text-[var(--c-success)]" />
        <p className="font-display text-sm font-medium text-[var(--c-ink)]">No report generated yet</p>
        <p className="text-xs text-[var(--c-muted)]">
          Generate a private analysis of your contributions for this session.
        </p>
        <Button
          style={{ background: "var(--c-success)", color: "white" }}
          onClick={() => void onGenerate()}
          disabled={generating}
        >
          {generating ? "Requesting..." : "Generate My Report"}
        </Button>
      </div>
    );
  }

  if (report?.status === "queued" || report?.status === "processing") {
    return (
      <div className="grid place-items-center gap-3 py-8">
        <CircleNotch size={28} className="animate-spin text-[var(--c-success)]" />
        <p className="font-display text-sm font-medium text-[var(--c-ink)]">Generating your report...</p>
        <p className="text-xs text-[var(--c-muted)]">
          Analyzing your contributions — this usually takes a few moments.
        </p>
      </div>
    );
  }

  if (report?.status === "error") {
    return (
      <div className="grid gap-4">
        <ErrorState
          title="Report generation failed"
          description={report.error ?? "An error occurred while generating your report."}
        />
        <div className="text-center">
          <Button variant="secondary" onClick={() => void onGenerate()} disabled={generating}>
            {generating ? "Requesting..." : "Retry"}
          </Button>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <div className="text-center">
        <ChartBar size={24} className="mx-auto mb-1 text-[var(--c-success)]" />
        <h2 className="font-display text-base font-medium text-[var(--c-ink)]">Your Personal Analysis</h2>
        <p className="mt-1 text-xs text-[var(--c-muted)]">
          Your private analysis based on your contributions this session.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricTile
          label="Participation"
          value={PARTICIPATION_LABELS[report.participationBand ?? ""] ?? "-"}
        />
        <MetricTile label="Reasoning" value={REASONING_LABELS[report.reasoningBand ?? ""] ?? "-"} />
        <MetricTile
          label="Originality"
          value={ORIGINALITY_LABELS[report.originalityBand ?? ""] ?? "-"}
        />
        <MetricTile
          label="Responsiveness"
          value={RESPONSIVENESS_LABELS[report.responsivenessBand ?? ""] ?? "-"}
        />
      </div>

      {report.summary ? (
        <Card title="Summary">
          <p className="text-xs leading-relaxed text-[var(--c-body)]">{report.summary}</p>
        </Card>
      ) : null}

      {report.contributionTrace ? (
        <Card title="Contribution Trace">
          <p className="text-xs leading-relaxed text-[var(--c-body)]">{report.contributionTrace}</p>
        </Card>
      ) : null}

      {report.argumentEvolution ? (
        <Card title="Argument Evolution">
          <p className="text-xs leading-relaxed text-[var(--c-body)]">{report.argumentEvolution}</p>
        </Card>
      ) : null}

      {report.growthOpportunity ? (
        <Card tone="cream">
          <p className="font-display text-xs font-semibold text-[var(--c-sig-mustard)]">
            Growth Opportunity
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--c-on-sig-light-body)]">
            {report.growthOpportunity}
          </p>
        </Card>
      ) : null}

      {report.generatedAt ? (
        <p className="text-center text-[10px] text-[var(--c-muted)]">
          Generated {new Date(report.generatedAt).toLocaleString()}
        </p>
      ) : null}

      <div className="text-center">
        <Button variant="ghost" onClick={() => void onGenerate()} disabled={generating}>
          {generating ? "Requesting..." : "Regenerate Report"}
        </Button>
      </div>
    </div>
  );
}
