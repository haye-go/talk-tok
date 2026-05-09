import { QRCodeSVG } from "qrcode.react";
import { Lightning, Megaphone, PushPin, Swords, Timer, Warning } from "@phosphor-icons/react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { InstructorShell } from "@/components/layout/instructor-shell";
import { PresenceBar } from "@/components/stream/presence-bar";
import { SubmissionCard } from "@/components/submission/submission-card";
import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { inputPatternLabel, type InputPattern } from "@/lib/submission-telemetry";
import { MOCK_CATEGORIES, MOCK_ACTIVITY_FEED } from "@/lib/mock-data";
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
    { composed_gradually: 0, likely_pasted: 0, mixed: 0, unknown: 0 },
  );

  return (
    <InstructorShell
      sessionTitle={session.title}
      participantCount={lobby.aggregate.total}
      left={
        <div className="grid gap-3">
          {/* Category board (mock — real categories come in backend Phase 07) */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--c-muted)]">Categories ({MOCK_CATEGORIES.length})</span>
            <a href="#" className="text-xs text-[var(--c-link)]">+ Add</a>
          </div>
          {MOCK_CATEGORIES.filter((c) => c.color !== "neutral").map((cat) => (
            <div
              key={cat.id}
              className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-2.5"
              style={{ borderLeft: `3px solid var(--c-sig-${cat.color})` }}
            >
              <div className="flex items-center justify-between">
                <strong className="font-display text-xs text-[var(--c-ink)]">{cat.name}</strong>
                <span className="text-[10px] text-[var(--c-muted)]">{cat.count}</span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-[var(--c-muted)]">
                {cat.summary.slice(0, 60)}...
              </p>
              <div className="mt-1.5 flex gap-1">
                <span className="cursor-pointer rounded bg-[var(--c-surface-strong)] px-1.5 py-0.5 text-[9px]">Rename</span>
                <span className="cursor-pointer rounded bg-[var(--c-surface-strong)] px-1.5 py-0.5 text-[9px]">Split</span>
                <span className="cursor-pointer rounded bg-[var(--c-surface-strong)] px-1.5 py-0.5 text-[9px]">
                  <PushPin size={9} className="inline" />
                </span>
                <span className="cursor-pointer rounded bg-[var(--c-sig-slate)] px-1.5 py-0.5 text-[9px] text-white">Follow-up</span>
              </div>
            </div>
          ))}

          {/* Uncategorized */}
          <div className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-2.5" style={{ borderLeft: "3px solid var(--c-muted)" }}>
            <div className="flex items-center justify-between">
              <strong className="text-xs text-[var(--c-muted)]">Uncategorized</strong>
              <span className="text-[10px] text-[var(--c-muted)]">4</span>
            </div>
            <button type="button" className="mt-1.5 rounded bg-[var(--c-sig-yellow)] px-2 py-0.5 text-[10px] font-medium text-[var(--c-on-sig-light)]">
              Run categorization
            </button>
          </div>

          {/* Overlap alert */}
          <div className="rounded-md border border-[var(--c-sig-yellow)] bg-[var(--c-surface-soft)] p-2.5">
            <p className="text-[10px] text-[var(--c-sig-mustard)]">
              <Warning size={10} className="mr-0.5 inline" /> Overlap detected
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--c-muted)]">
              "Cost & Access" and "Trust & Accuracy" share 3 similar responses
            </p>
            <a href="#" className="text-[10px] text-[var(--c-link)]">Review merge</a>
          </div>

          {/* QR code (real data) */}
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
        </div>
      }
      center={
        <div className="grid gap-3">
          {/* Metrics row */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <MetricTile label="Submitted" value={String(submissions.length)} />
            <MetricTile label="Categories" value={String(MOCK_CATEGORIES.length - 1)} />
            <MetricTile label="Recat Req" value="3" />
            <MetricTile label="Originality" value="67%" />
          </div>

          {/* Typing presence (real data) */}
          {lobby && (
            <PresenceBar
              typing={lobby.aggregate.typing}
              submitted={lobby.aggregate.submitted ?? 0}
              idle={lobby.aggregate.idle}
            />
          )}

          {/* Consensus pulse (mock) */}
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
            <p className="mt-1 text-center text-[9px] text-[var(--c-muted)]">
              "AI should assist diagnosis" — 45% agree, 30% against, 25% nuanced
            </p>
          </Card>

          {/* Input pattern pulse (real data) */}
          <Card title="Input Patterns">
            <div className="grid gap-1.5 text-sm">
              {(Object.keys(patternCounts) as InputPattern[]).map((pattern) => (
                <div key={pattern} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[var(--c-body)]">{inputPatternLabel(pattern)}</span>
                  <span className="font-mono text-xs text-[var(--c-ink)]">{patternCounts[pattern]}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Real submissions */}
          <Card title="Recent Submissions">
            <div className="grid gap-3">
              {submissions.length === 0 && (
                <p className="text-sm text-[var(--c-muted)]">No submissions yet.</p>
              )}
              {submissions.slice(0, 8).map((submission) => (
                <SubmissionCard key={submission.id} submission={submission} />
              ))}
            </div>
          </Card>
        </div>
      }
      right={
        <div className="grid gap-3">
          {/* Activity feed (mock — real feed comes in backend Phase 12) */}
          <p className="text-xs text-[var(--c-muted)]">Live Activity</p>
          {MOCK_ACTIVITY_FEED.map((event, i) => {
            const dotColor =
              event.type === "fightme"
                ? "var(--c-sig-coral)"
                : event.type === "shift"
                  ? "var(--c-sig-peach)"
                  : event.type === "recat"
                    ? "var(--c-sig-yellow)"
                    : "categoryColor" in event && event.categoryColor !== "neutral"
                      ? `var(--c-sig-${event.categoryColor})`
                      : "var(--c-muted)";

            return (
              <div key={i} className="border-b border-[var(--c-hairline)] pb-2 text-xs text-[var(--c-body)]">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: dotColor }} />
                {event.type === "submit" && "category" in event && (
                  <>
                    <strong>{event.name}</strong> submitted → <span className="text-[var(--c-ink)]">{event.category}</span>
                    {" · "}<span className="text-[var(--c-muted)]">{"originality" in event ? event.originality : ""}</span>
                    {"telemetryLabel" in event && event.telemetryLabel && (
                      <div className="mt-0.5 text-[10px]" style={{ color: event.telemetryLabel.includes("pasted") ? "var(--c-sig-coral)" : "var(--c-muted)" }}>
                        {event.telemetryLabel.includes("pasted") ? <Lightning size={10} className="mr-0.5 inline" /> : <Timer size={10} className="mr-0.5 inline" />}
                        {event.telemetryLabel}
                      </div>
                    )}
                  </>
                )}
                {event.type === "recat" && "fromCategory" in event && (
                  <>
                    <strong>{event.name}</strong> recat: {event.fromCategory} → {event.toCategory}
                  </>
                )}
                {event.type === "followup" && <><strong>{event.name}</strong> added follow-up</>}
                {event.type === "fightme" && (
                  <>
                    <Swords size={10} className="mr-0.5 inline" />
                    <strong>{event.name}</strong> started Fight Me vs AI
                  </>
                )}
                {event.type === "shift" && "category" in event && (
                  <>
                    <strong>{event.name}</strong> flagged position shift in {event.category}
                  </>
                )}
                <span className="ml-1.5 text-[10px] text-[var(--c-muted)]">{event.time}</span>
              </div>
            );
          })}

          {/* Real participants (from Convex) */}
          <Card title="Recent Participants">
            <div className="grid gap-2">
              {lobby.recentParticipants.length === 0 && (
                <p className="text-sm text-[var(--c-muted)]">No participants yet.</p>
              )}
              {lobby.recentParticipants.map((participant) => (
                <div
                  key={participant.participantSlug}
                  className="flex items-center justify-between rounded-sm bg-[var(--c-surface-strong)] px-3 py-2 text-sm"
                >
                  <span className="font-medium text-[var(--c-ink)]">{participant.nickname}</span>
                  <span className="text-xs text-[var(--c-muted)]">{participant.presenceState}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      }
    />
  );
}
