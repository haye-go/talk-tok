import { QRCodeSVG } from "qrcode.react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { InstructorShell } from "@/components/layout/instructor-shell";
import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { SubmissionCard } from "@/components/submission/submission-card";
import { inputPatternLabel, type InputPattern } from "@/lib/submission-telemetry";
import { routes } from "@/lib/routes";

export function InstructorSessionPage() {
  const { sessionSlug } = useParams({ from: "/instructor/session/$sessionSlug" });
  const session = useQuery(api.sessions.getBySlug, { sessionSlug });
  const lobby = useQuery(api.participants.listLobby, { sessionSlug });
  const submissions = useQuery(api.submissions.listForSession, { sessionSlug, limit: 50 });

  if (session === undefined || lobby === undefined || submissions === undefined) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
        <LoadingState label="Loading instructor session..." className="w-full max-w-md" />
      </main>
    );
  }

  if (session === null || lobby === null || submissions === null) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
        <ErrorState
          title="Session not found"
          description="This instructor session URL does not match an existing session."
        />
      </main>
    );
  }

  const joinPath = routes.join(session.joinCode);
  const joinUrl =
    typeof window === "undefined" ? joinPath : new URL(joinPath, window.location.origin).toString();
  const patternCounts = submissions.reduce<Record<InputPattern, number>>(
    (counts, submission) => {
      counts[submission.inputPattern] += 1;
      return counts;
    },
    {
      composed_gradually: 0,
      likely_pasted: 0,
      mixed: 0,
      unknown: 0,
    },
  );

  return (
    <InstructorShell
      sessionTitle={session.title}
      participantCount={lobby.aggregate.total}
      left={
        <div className="grid gap-4">
          <Card title="Join Access" eyebrow={session.joinCode}>
            <div className="grid justify-items-start gap-3">
              <div className="rounded-md bg-white p-3">
                <QRCodeSVG value={joinUrl} size={160} />
              </div>
              <p className="break-all text-xs text-[var(--c-muted)]">{joinUrl}</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => (window.location.href = routes.instructorProjector(session.slug))}
              >
                Open projector
              </Button>
            </div>
          </Card>
          <Card title="Session Config">
            <div className="grid gap-2 text-sm">
              <p>Mode: {session.modePreset}</p>
              <p>Visibility: {session.visibilityMode}</p>
              <p>Default tone: {session.critiqueToneDefault}</p>
            </div>
          </Card>
        </div>
      }
      center={
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <MetricTile label="Submitted" value={String(submissions.length)} detail="Responses" />
            <MetricTile
              label="Typing"
              value={String(lobby.aggregate.typing)}
              detail="Presence pulse"
            />
            <MetricTile
              label="Idle"
              value={String(lobby.aggregate.idle)}
              detail="No recent typing"
            />
          </div>
          <Card title={session.title} eyebrow={`/${session.slug}`}>
            <p className="text-sm text-[var(--c-body)]">{session.openingPrompt}</p>
          </Card>
          <Card title="Presence Aggregate">
            <div className="h-3 overflow-hidden rounded-full bg-[var(--c-surface-strong)]">
              <div
                className="h-full bg-[var(--c-success)]"
                style={{
                  width: `${Math.min(100, Math.round((lobby.aggregate.total / 30) * 100))}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--c-muted)]">
              {lobby.aggregate.submitted} submitted - {lobby.aggregate.offline} offline
            </p>
          </Card>
          <Card title="Recent Submissions">
            <div className="grid gap-3">
              {submissions.length === 0 ? (
                <p className="text-sm text-[var(--c-muted)]">No submissions yet.</p>
              ) : null}
              {submissions.slice(0, 8).map((submission) => (
                <SubmissionCard key={submission.id} submission={submission} />
              ))}
            </div>
          </Card>
        </div>
      }
      right={
        <div className="grid gap-4">
          <Card title="Input Pattern Pulse">
            <div className="grid gap-2 text-sm">
              {(Object.keys(patternCounts) as InputPattern[]).map((pattern) => (
                <div key={pattern} className="flex items-center justify-between gap-3">
                  <span>{inputPatternLabel(pattern)}</span>
                  <span className="font-mono text-[var(--c-ink)]">{patternCounts[pattern]}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Recent Participants">
            <div className="grid gap-2">
              {lobby.recentParticipants.length === 0 ? (
                <p className="text-sm text-[var(--c-muted)]">No participants yet.</p>
              ) : null}
              {lobby.recentParticipants.map((participant) => (
                <div
                  key={participant.participantSlug}
                  className="rounded-sm bg-[var(--c-surface-strong)] px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-[var(--c-ink)]">{participant.nickname}</span>
                    <span className="text-xs text-[var(--c-muted)]">
                      {participant.presenceState}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      }
    />
  );
}
