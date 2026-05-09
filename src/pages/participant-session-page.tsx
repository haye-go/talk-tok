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
import { FightThread } from "@/components/fight/fight-thread";
import { PresenceBar } from "@/components/stream/presence-bar";
import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";
import { PretextDisplay } from "@/components/text/pretext-display";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { getOrCreateClientKey, storeParticipant } from "@/lib/client-identity";
import { routes } from "@/lib/routes";

export function ParticipantSessionPage() {
  const { sessionSlug } = useParams({ from: "/session/$sessionSlug" });
  const session = useQuery(api.sessions.getBySlug, { sessionSlug });
  const lobby = useQuery(api.participants.listLobby, { sessionSlug });
  const [clientKey, setClientKey] = useState<string | null>(null);
  const participant = useQuery(
    api.participants.restore,
    clientKey ? { sessionSlug, clientKey } : "skip",
  );
  const mySubmissions = useQuery(
    api.submissions.listMine,
    clientKey ? { sessionSlug, clientKey } : "skip",
  );
  const sessionSubmissions = useQuery(api.submissions.listForSession, { sessionSlug, limit: 25 });
  const updateNickname = useMutation(api.participants.updateNickname);
  const touchPresence = useMutation(api.participants.touchPresence);
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
    if (!participant || !clientKey) {
      return;
    }

    setNickname(participant.nickname);
    storeParticipant({
      sessionSlug,
      participantSlug: participant.participantSlug,
      nickname: participant.nickname,
    });
    const presenceKey = `${sessionSlug}:${participant.participantSlug}:${clientKey}`;

    if (touchedPresenceKey.current === presenceKey) {
      return;
    }

    touchedPresenceKey.current = presenceKey;
    void touchPresence({ sessionSlug, clientKey, presenceState: "idle" });
  }, [clientKey, participant, sessionSlug, touchPresence]);

  async function handleNicknameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!participant || !clientKey) {
      return;
    }

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

  async function handleCreateSubmission(
    { body, telemetry }: ResponseComposerSubmit,
    kind: "initial" | "additional_point" = "initial",
    parentSubmissionId?: Id<"submissions">,
  ) {
    if (!clientKey) {
      return;
    }

    setSubmissionError(null);

    try {
      await createSubmission({
        sessionSlug,
        clientKey,
        body,
        kind,
        parentSubmissionId,
        telemetry,
      });
      setFollowUpParentId(null);
    } catch (cause) {
      setSubmissionError(cause instanceof Error ? cause.message : "Could not submit response.");
      throw cause;
    }
  }

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
            onClick={() => (window.location.href = routes.join(session.joinCode))}
          >
            Join with nickname
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <ParticipantShell
      main={
        <div className="grid gap-4">
          {/* Submit act: topic card + composer with real submission handler */}
          {session.currentAct === "submit" && (
            <>
              <div className="rounded-md bg-[var(--c-sig-cream)] p-3.5">
                <p className="text-sm font-medium leading-relaxed text-[var(--c-on-sig-light)]">
                  &ldquo;{session.openingPrompt}&rdquo;
                </p>
              </div>
              {submissionError && (
                <InlineAlert tone="error">{submissionError}</InlineAlert>
              )}
              <ResponseComposer
                softWordLimit={session.responseSoftLimitWords}
                submitLabel="Submit response"
                onSubmit={(_text, _tone, submission) => handleCreateSubmission(submission)}
              />
              <p className="text-xs text-[var(--c-muted)]">
                Signed in as {participant.nickname}
              </p>
            </>
          )}
          {session.currentAct === "discover" && <DiscoverAct />}
          {session.currentAct === "challenge" && <ChallengeAct />}
          {session.currentAct === "synthesize" && <SynthesizeAct />}
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
          {session.visibilityMode === "raw_responses_visible" && sessionSubmissions ? (
            <div className="grid gap-3">
              {sessionSubmissions.map((submission) => (
                <SubmissionCard key={submission.id} submission={submission} />
              ))}
            </div>
          ) : (
            <Card>
              <PretextDisplay
                text={`${sessionSubmissions?.length ?? 0} responses collected. Peer responses remain private until the instructor releases them.`}
              />
            </Card>
          )}
          {lobby && lobby.recentParticipants.length > 0 && (
            <Card title="Lobby">
              <div className="grid gap-2">
                {lobby.recentParticipants.map((item) => (
                  <div
                    key={item.participantSlug}
                    className="flex items-center justify-between rounded-sm bg-[var(--c-surface-strong)] px-3 py-2 text-sm"
                  >
                    <span className="text-[var(--c-ink)]">{item.nickname}</span>
                    <span className="text-xs text-[var(--c-muted)]">{item.presenceState}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      }
      fightMe={<FightThread />}
      myZone={
        <div className="grid gap-4">
          <div className="-mx-4 -mt-4 bg-[var(--c-sig-peach)] px-4 py-4">
            <h2 className="font-display text-lg font-medium text-[var(--c-on-sig-light)]">
              My Zone
            </h2>
            <p className="text-xs text-[var(--c-on-sig-light-body)]" style={{ opacity: 0.7 }}>
              Your responses and analysis
            </p>
          </div>
          {mySubmissions === undefined && <LoadingState label="Loading your responses..." />}
          {mySubmissions?.length === 0 && (
            <p className="text-sm text-[var(--c-muted)]">Your submitted responses appear here.</p>
          )}
          {mySubmissions && mySubmissions.length > 0 && (
            <div className="grid gap-3">
              {mySubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  showAuthor={false}
                  onAddFollowUp={(submissionId) => setFollowUpParentId(submissionId)}
                />
              ))}
            </div>
          )}
          {followUpParentId && (
            <Card
              title="Add follow-up"
              action={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFollowUpParentId(null)}
                >
                  Cancel
                </Button>
              }
            >
              <ResponseComposer
                softWordLimit={session.responseSoftLimitWords}
                submitLabel="Add follow-up"
                placeholder="Add a clarification or extra point..."
                onSubmit={(_text, _tone, submission) =>
                  handleCreateSubmission(submission, "additional_point", followUpParentId)
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
              <Button type="submit" variant="secondary">
                Update nickname
              </Button>
            </form>
          </Card>
        </div>
      }
    />
  );
}
