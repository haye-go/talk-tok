import { useEffect, useState, type FormEvent } from "react";
import { QrCode } from "@phosphor-icons/react";
import { useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getOrCreateClientKey,
  readStoredParticipant,
  storeParticipant,
} from "@/lib/client-identity";
import { routes } from "@/lib/routes";
import { normalizeSessionCode } from "@/lib/session-slug";

export function JoinPage() {
  const { sessionCode } = useParams({ from: "/join/$sessionCode" });
  const normalizedCode = normalizeSessionCode(sessionCode);
  const session = useQuery(api.sessions.getByJoinCode, { sessionCode: normalizedCode });
  const joinSession = useMutation(api.participants.join);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    const stored = readStoredParticipant(session.slug);

    if (stored?.nickname) {
      setNickname(stored.nickname);
    }
  }, [session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const clientKey = getOrCreateClientKey();
      const result = await joinSession({
        sessionCode: normalizedCode,
        nickname,
        clientKey,
      });

      storeParticipant({
        sessionSlug: result.session.slug,
        participantSlug: result.participant.participantSlug,
        nickname: result.participant.nickname,
      });

      window.location.href = routes.session(result.session.slug);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not join the session.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
      <Card title="Join Discussion" eyebrow="Participant entry" className="w-full max-w-md">
        {session === undefined ? <LoadingState label="Finding session..." /> : null}
        {session === null ? (
          <ErrorState
            title="Session not found"
            description={`No active session was found for code ${normalizedCode}. Check the code and try again.`}
          />
        ) : null}
        {session ? (
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <Input
              label="Session code"
              value={session.joinCode}
              readOnly
              className="text-center font-mono text-2xl tracking-[0.3em]"
            />
            <div>
              <h2 className="font-display text-lg font-medium text-[var(--c-ink)]">
                {session.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--c-muted)]">{session.openingPrompt}</p>
            </div>
            <Input
              label="Nickname"
              placeholder="Enter a nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              required
            />
            {error ? <p className="text-sm text-[var(--c-error)]">{error}</p> : null}
            <Button type="submit" icon={<QrCode size={18} />} disabled={isSubmitting}>
              {isSubmitting ? "Joining..." : "Continue to session"}
            </Button>
            <p className="text-center text-xs text-[var(--c-muted)]">
              This browser will remember your participant identity for this session.
            </p>
          </form>
        ) : null}
      </Card>
    </main>
  );
}
