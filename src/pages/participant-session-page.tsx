import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ParticipantShell } from "@/components/layout/participant-shell";
import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";
import { PretextDisplay } from "@/components/text/pretext-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const updateNickname = useMutation(api.participants.updateNickname);
  const touchPresence = useMutation(api.participants.touchPresence);
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
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
          <Card title={session.title} eyebrow={`Act ${session.currentAct} - ${session.phase}`}>
            <PretextDisplay text={session.openingPrompt} />
            <p className="mt-3 text-xs text-[var(--c-muted)]">
              Signed in as {participant.nickname}
            </p>
          </Card>
          <Card title="Your response">
            <Textarea label="Response" placeholder="Write your perspective..." />
            <div className="mt-3 flex items-center justify-between gap-3">
              <Badge tone="warning">{session.critiqueToneDefault} tone</Badge>
              <Button type="button">Submit</Button>
            </div>
          </Card>
        </div>
      }
      stream={
        <div className="grid gap-4">
          <Card title="Lobby Presence">
            {lobby ? (
              <div className="grid gap-3 text-sm">
                <p>
                  {lobby.aggregate.total} joined - {lobby.aggregate.idle} idle -{" "}
                  {lobby.aggregate.typing} typing - {lobby.aggregate.offline} offline
                </p>
                <div className="grid gap-2">
                  {lobby.recentParticipants.map((item) => (
                    <div
                      key={item.participantSlug}
                      className="flex items-center justify-between rounded-sm bg-[var(--c-surface-strong)] px-3 py-2"
                    >
                      <span>{item.nickname}</span>
                      <span className="text-xs text-[var(--c-muted)]">{item.presenceState}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <LoadingState label="Loading lobby..." />
            )}
          </Card>
          <Card title="Response Stream">
            <PretextDisplay text="Responses and category reveals start in Phase 03." />
          </Card>
        </div>
      }
      fightMe={<Card title="Fight Me">Fight Me entry and debate states will mount here.</Card>}
      myZone={
        <div className="grid gap-4">
          <Card title="My Zone">
            Private response history, feedback, and contribution trace will mount here.
          </Card>
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
