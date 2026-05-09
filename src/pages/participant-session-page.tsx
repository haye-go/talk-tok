import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ParticipantShell } from "@/components/layout/participant-shell";
import {
  ResponseComposer,
  type ResponseComposerSubmit,
} from "@/components/submission/response-composer";
import { SubmissionCard } from "@/components/submission/submission-card";
import { DiscoverAct } from "@/components/acts/discover-act";
import { ChallengeAct } from "@/components/acts/challenge-act";
import { SynthesizeAct } from "@/components/acts/synthesize-act";
import { StreamTab } from "@/components/stream/stream-tab";
import { MyZoneTab } from "@/components/myzone/my-zone-tab";
import { FightThread } from "@/components/fight/fight-thread";
import { PresenceBar } from "@/components/stream/presence-bar";
import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { useParticipantWorkspace } from "@/hooks/use-participant-workspace";
import { getOrCreateClientKey, storeParticipant } from "@/lib/client-identity";
import { routes } from "@/lib/routes";

export function ParticipantSessionPage() {
  const { sessionSlug } = useParams({ from: "/session/$sessionSlug" });
  const [clientKey, setClientKey] = useState<string | null>(null);

  // Primary data source — one query for all participant state
  const workspace = useParticipantWorkspace(sessionSlug, clientKey);

  // Keep existing individual queries for join-gate and lobby (workspace returns null if not joined)
  const session = useQuery(api.sessions.getBySlug, { sessionSlug });
  const participant = useQuery(
    api.participants.restore,
    clientKey ? { sessionSlug, clientKey } : "skip",
  );
  const lobby = useQuery(api.participants.listLobby, { sessionSlug });

  const updateNickname = useMutation(api.participants.updateNickname);
  const touchPresence = useMutation(api.participants.touchPresence);
  const submitAndQueue = useMutation(api.participantWorkspace.submitAndQueueFeedback);
  const createSubmission = useMutation(api.submissions.create);

  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [followUpParentId, setFollowUpParentId] = useState<Id<"submissions"> | null>(null);
  const touchedPresenceKey = useRef<string | null>(null);

  useEffect(() => {
    setClientKey(getOrCreateClientKey());
  }, []);

  useEffect(() => {
    if (!participant || !clientKey) return;

    setNickname(participant.nickname);
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
        kind: "initial",
        tone: (sub.tone as "gentle" | "direct" | "spicy" | "roast") ?? undefined,
        telemetry: sub.telemetry,
      });
    } catch (cause) {
      setSubmissionError(cause instanceof Error ? cause.message : "Could not submit response.");
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

  // Loading / error / join-gate states (unchanged)
  if (session === undefined || participant === undefined) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
        <LoadingState label="Loading session..." className="w-full max-w-md" />
      </main>
    );
  }
  if (session === null) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
        <ErrorState title="Session not found" description="This readable session URL does not match an existing session." />
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
          <Button type="button" className="mt-4 w-full" onClick={() => (window.location.href = routes.join(session.joinCode))}>
            Join with nickname
          </Button>
        </Card>
      </main>
    );
  }

  // Workspace data (may still be loading after join gate passes)
  const ws = workspace;
  const currentAct = ws?.session.currentAct ?? session.currentAct;
  const firstFeedback = ws?.feedbackBySubmission?.[0] ?? null;
  const firstAssignment = ws?.assignmentsBySubmission?.[0] ?? null;

  return (
    <ParticipantShell
      main={
        <div className="grid gap-4">
          {currentAct === "submit" && (
            <>
              <div className="rounded-md bg-[var(--c-sig-cream)] p-3.5">
                <p className="text-sm font-medium leading-relaxed text-[var(--c-on-sig-light)]">
                  &ldquo;{session.openingPrompt}&rdquo;
                </p>
              </div>
              {submissionError && <InlineAlert tone="error">{submissionError}</InlineAlert>}
              <ResponseComposer
                softWordLimit={session.responseSoftLimitWords}
                submitLabel="Submit response"
                onSubmit={(_text, _tone, submission) => handleSubmit(submission)}
              />
              <p className="text-xs text-[var(--c-muted)]">Signed in as {participant.nickname}</p>
            </>
          )}
          {currentAct === "discover" && (
            <DiscoverAct
              feedback={firstFeedback}
              categories={ws?.categorySummary}
              assignment={firstAssignment}
            />
          )}
          {currentAct === "challenge" && (
            <ChallengeAct
              activeFollowUps={ws?.activeFollowUps}
              fightMeEnabled={ws?.session.fightMeEnabled ?? session.fightMeEnabled}
            />
          )}
          {currentAct === "synthesize" && (
            <SynthesizeAct categories={ws?.categorySummary} />
          )}
        </div>
      }
      stream={
        <div className="grid gap-4">
          {lobby && (
            <PresenceBar
              typing={lobby.aggregate.typing}
              submitted={lobby.aggregate.submitted ?? 0}
              idle={lobby.aggregate.idle}
            />
          )}
          <StreamTab
            peerResponses={ws?.recentPeerResponses}
            categories={ws?.categorySummary}
            canSeeRawPeerResponses={ws?.visibility.canSeeRawPeerResponses}
            canSeeCategorySummary={ws?.visibility.canSeeCategorySummary}
          />
        </div>
      }
      fightMe={<FightThread />}
      myZone={
        <div className="grid gap-4">
          <MyZoneTab
            initialResponses={ws?.myZoneHistory.initialResponses}
            followUpResponses={ws?.myZoneHistory.followUpResponses}
            feedbackBySubmission={ws?.feedbackBySubmission}
            assignmentsBySubmission={ws?.assignmentsBySubmission}
            recategorisationRequests={ws?.recategorisationRequests}
            fightThreads={ws?.fightMe.mine}
            loading={ws === undefined}
          />
          {followUpParentId && (
            <Card
              title="Add follow-up"
              action={
                <Button type="button" variant="ghost" size="sm" onClick={() => setFollowUpParentId(null)}>
                  Cancel
                </Button>
              }
            >
              <ResponseComposer
                softWordLimit={session.responseSoftLimitWords}
                submitLabel="Add follow-up"
                placeholder="Add a clarification or extra point..."
                onSubmit={(_text, _tone, submission) =>
                  handleFollowUp(submission, followUpParentId)
                }
              />
            </Card>
          )}
          <Card title="Nickname">
            <form className="grid gap-3" onSubmit={handleNicknameSubmit}>
              <Input
                label="Visible nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                error={nicknameError ?? undefined}
              />
              <Button type="submit" variant="secondary">Update nickname</Button>
            </form>
          </Card>
        </div>
      }
    />
  );
}
