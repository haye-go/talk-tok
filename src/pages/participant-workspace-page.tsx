import { useEffect, useMemo, useRef, useState, type ComponentProps, type FormEvent } from "react";
import { ChartBar, CircleNotch, Sword, X } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ContributionThreadCard } from "@/components/contribute/contribution-thread-card";
import { FightCountdown } from "@/components/fight/fight-countdown";
import { FightHome } from "@/components/fight/fight-home";
import { FightThread } from "@/components/fight/fight-thread";
import { ParticipantShell } from "@/components/layout/participant-shell";
import { ParticipantStateSection } from "@/components/layout/participant-state-section";
import { MyZoneTab } from "@/components/myzone/my-zone-tab";
import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";
import { StreamTab } from "@/components/stream/stream-tab";
import { InlineFollowUpComposer } from "@/components/submission/inline-follow-up-composer";
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
  summary?: string | null;
  contributionTrace?: string | null;
  argumentEvolution?: string | null;
  generatedAt?: number | null;
  error?: string | null;
}

type IncomingFight = NonNullable<
  ReturnType<typeof useParticipantWorkspace>
>["fightMe"]["pendingIncoming"][number];

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

  const [selectedQuestionOverrideId, setSelectedQuestionOverrideId] =
    useState<Id<"sessionQuestions"> | null>(null);
  const routeDrivenTab: TabId | null = fightSlug ? "fight" : showReviewDetail ? "me" : null;
  const [localActiveTab, setLocalActiveTab] = useState<TabId>(requestedTab ?? initialTab);
  const activeTab = routeDrivenTab ?? localActiveTab;
  const workspace = useParticipantWorkspace(
    sessionSlug,
    clientKey,
    selectedQuestionOverrideId,
    activeTab,
  );

  const session = useQuery(api.sessions.getBySlugSnapshot, { sessionSlug });
  const participant = useQuery(
    api.participants.restore,
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
  const generateReport = useMutation(api.personalReports.generateMine);
  const acceptChallenge = useMutation(api.fightMe.acceptChallenge);
  const declineChallenge = useMutation(api.fightMe.declineChallenge);

  const [nicknameDraft, setNicknameDraft] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [followUpParentId, setFollowUpParentId] = useState<Id<"submissions"> | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [dismissedFightAlertId, setDismissedFightAlertId] = useState<string | null>(null);
  const [fightAlertBusy, setFightAlertBusy] = useState<"accept" | "decline" | null>(null);
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
    try {
      await submitAndQueue({
        sessionSlug,
        clientKey,
        body: sub.body,
        questionId: workspace?.selectedQuestion?.id,
        kind: "initial",
        telemetry: sub.telemetry,
      });
    } catch (cause) {
      setSubmissionError(cause instanceof Error ? cause.message : "Could not submit response.");
      throw cause;
    }
  }

  async function handleAddAnotherPoint(sub: ResponseComposerSubmit) {
    if (!clientKey) return;
    setSubmissionError(null);
    try {
      await submitAndQueue({
        sessionSlug,
        clientKey,
        body: sub.body,
        questionId: workspace?.selectedQuestion?.id,
        kind: "additional_point",
        telemetry: sub.telemetry,
      });
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

  async function handleGenerateReport() {
    if (!clientKey || generatingReport) return;
    setGeneratingReport(true);
    try {
      await generateReport({ sessionSlug, clientKey });
    } finally {
      setGeneratingReport(false);
    }
  }

  async function handleAcceptFightAlert(fightSlugToAccept: string) {
    if (fightAlertBusy) return;
    setFightAlertBusy("accept");
    try {
      await acceptChallenge({ sessionSlug, clientKey, fightSlug: fightSlugToAccept });
      void navigate({ to: routes.sessionFight(sessionSlug, fightSlugToAccept) });
    } finally {
      setFightAlertBusy(null);
    }
  }

  async function handleDeclineFightAlert(fightId: string, fightSlugToDecline: string) {
    if (fightAlertBusy) return;
    setFightAlertBusy("decline");
    try {
      await declineChallenge({ sessionSlug, clientKey, fightSlug: fightSlugToDecline });
      setDismissedFightAlertId(fightId);
    } finally {
      setFightAlertBusy(null);
    }
  }

  function handleTabChange(nextTab: TabId) {
    setLocalActiveTab(nextTab);
    void navigate({
      to: routes.sessionTab(sessionSlug, nextTab),
    });
  }

  if (
    session === undefined ||
    participant === undefined ||
    (showReviewDetail && report === undefined)
  ) {
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

  const myThreads = ws?.myThreads ?? [];
  const topLevelContributions = myThreads.map((thread) => thread.root.submission);

  const primaryContribution = topLevelContributions[0] ?? null;

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
    selectedQuestion?.fightEnabled ?? ws?.session.fightMeEnabled ?? session.fightMeEnabled;
  const contributionsOpen = selectedQuestion?.contributionsOpen ?? true;
  const repliesEnabled = selectedQuestion?.repliesEnabled ?? false;
  const upvotesEnabled = selectedQuestion?.upvotesEnabled ?? false;
  const canUseFightMe = Boolean(clientKey && primaryContribution && canUseFight);
  const selectedPrompt = selectedQuestion?.prompt ?? session.openingPrompt;

  const followUpComposer = followUpParentId ? (
    <InlineFollowUpComposer
      softWordLimit={session.responseSoftLimitWords}
      onSubmit={(submission) => handleFollowUp(submission, followUpParentId)}
      onCancel={() => setFollowUpParentId(null)}
    />
  ) : null;

  const promptLabel = selectedQuestion?.isCurrent ? "Current Topic" : "Released question";
  const showParticipantIdentity =
    activeTab !== "contribute" || session.anonymityMode !== "anonymous_to_peers";
  const incomingFightAlert =
    activeTab === "fight"
      ? null
      : (ws?.fightMe.pendingIncoming.find(
          (fight) => fight.id !== dismissedFightAlertId && fight.status === "pending_acceptance",
        ) ?? null);

  return (
    <>
      {incomingFightAlert ? (
        <IncomingFightAlert
          fight={incomingFightAlert}
          busy={fightAlertBusy}
          onAccept={() => void handleAcceptFightAlert(incomingFightAlert.slug)}
          onDecline={() =>
            void handleDeclineFightAlert(incomingFightAlert.id, incomingFightAlert.slug)
          }
          onDismiss={() => setDismissedFightAlertId(incomingFightAlert.id)}
          onView={() =>
            void navigate({ to: routes.sessionFight(sessionSlug, incomingFightAlert.slug) })
          }
        />
      ) : null}
      <ParticipantShell
        sessionTitle={session.title}
        joinCode={session.joinCode}
        nickname={participant.nickname}
        sessionSlug={sessionSlug}
        showIdentity={showParticipantIdentity}
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
          setSelectedQuestionOverrideId(questionId as typeof selectedQuestionOverrideId)
        }
        presenceTyping={ws?.presenceAggregate.typing ?? 0}
        activeTab={activeTab}
        onActiveTabChange={handleTabChange}
        contribute={
          <div className="grid gap-4">
            {submissionError ? <InlineAlert tone="error">{submissionError}</InlineAlert> : null}

            {!contributionsOpen && topLevelContributions.length === 0 ? (
              <ParticipantStateSection kind="locked" title="Contributions paused">
                This question is browseable, but new contributions are closed until the instructor
                reopens it.
              </ParticipantStateSection>
            ) : null}

            {!contributionsOpen ? (
              <p className="text-xs text-[var(--c-muted)]">New contributions are paused.</p>
            ) : null}

            {contributionsOpen ? (
              <ResponseComposer
                softWordLimit={session.responseSoftLimitWords}
                submitLabel={
                  topLevelContributions.length === 0 ? "Submit response" : "Add another point"
                }
                placeholder={
                  topLevelContributions.length === 0
                    ? "Post your questions / thoughts..."
                    : "Add a response..."
                }
                onSubmit={(_text, submission) =>
                  topLevelContributions.length === 0
                    ? handleSubmit(submission)
                    : handleAddAnotherPoint(submission)
                }
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
                      assignment={thread.assignment}
                      followUps={thread.replies.map((reply) => ({
                        id: reply.submission.id,
                        body: reply.submission.body,
                        createdAt: reply.submission.createdAt,
                        followUpTitle: reply.submission.kind === "reply" ? "Reply" : "Follow-up",
                      }))}
                      isLatest={index === 0}
                      onAddFollowUp={() => setFollowUpParentId(submission.id)}
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
            myArchiveByQuestion={ws?.myArchiveByQuestion}
            fightThreads={ws?.fightMe.mine}
            positionShifts={ws?.positionShifts}
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
    </>
  );
}

interface IncomingFightAlertProps {
  fight: IncomingFight;
  busy: "accept" | "decline" | null;
  onAccept: () => void;
  onDecline: () => void;
  onDismiss: () => void;
  onView: () => void;
}

function IncomingFightAlert({
  fight,
  busy,
  onAccept,
  onDecline,
  onDismiss,
  onView,
}: IncomingFightAlertProps) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-fight-title"
    >
      <div className="w-full max-w-md rounded-lg border border-[var(--c-tab-fight)] bg-[var(--c-surface-soft)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-pill bg-[var(--c-tab-fight)] text-[var(--c-on-sig-dark)]">
              <Sword size={20} />
            </span>
            <div>
              <p
                id="incoming-fight-title"
                className="font-display text-lg font-semibold text-[var(--c-ink)]"
              >
                Incoming fight challenge
              </p>
              <p className="mt-1 text-sm text-[var(--c-muted)]">
                A challenger wants to debate your post.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-pill p-2 text-[var(--c-muted)] transition hover:bg-[var(--c-surface-strong)] hover:text-[var(--c-ink)]"
            aria-label="Dismiss fight alert"
            onClick={onDismiss}
          >
            <X size={18} />
          </button>
        </div>

        {fight.acceptanceDeadlineAt ? (
          <div className="mt-4 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-strong)] px-3 py-2">
            <FightCountdown deadlineAt={fight.acceptanceDeadlineAt} label="Accept before:" />
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="coral"
            className="flex-1"
            disabled={busy !== null}
            onClick={onAccept}
          >
            {busy === "accept" ? "Accepting..." : "Accept fight"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={busy !== null}
            onClick={onView}
          >
            View
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            disabled={busy !== null}
            onClick={onDecline}
          >
            {busy === "decline" ? "Declining..." : "Decline"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface FightTabContentProps {
  sessionSlug: string;
  clientKey: string;
  myParticipantId: string;
  myFights: NonNullable<ReturnType<typeof useParticipantWorkspace>>["fightMe"]["mine"];
  pendingIncoming: NonNullable<
    ReturnType<typeof useParticipantWorkspace>
  >["fightMe"]["pendingIncoming"];
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
  myArchiveByQuestion?: ComponentProps<typeof MyZoneTab>["myArchiveByQuestion"];
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
  myArchiveByQuestion,
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
        myArchiveByQuestion={myArchiveByQuestion}
        fightThreads={fightThreads}
        positionShifts={positionShifts}
        personalReport={personalReport}
        personalReportsVisible={personalReportsVisible}
        generatingReport={generatingReport}
        loading={loading}
        onViewFight={onViewFight}
        onViewReport={onViewReport}
        onGenerateReport={onGenerateReport}
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
        <p className="font-display text-sm font-medium text-[var(--c-ink)]">
          No report generated yet
        </p>
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
        <p className="font-display text-sm font-medium text-[var(--c-ink)]">
          Generating your report...
        </p>
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
        <h2 className="font-display text-base font-medium text-[var(--c-ink)]">
          Your Personal Analysis
        </h2>
        <p className="mt-1 text-xs text-[var(--c-muted)]">
          Your private analysis based on your contributions this session.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricTile
          label="Participation"
          value={PARTICIPATION_LABELS[report.participationBand ?? ""] ?? "-"}
        />
        <MetricTile label="Reasoning" value={REASONING_LABELS[report.reasoningBand ?? ""] ?? "-"} />
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
