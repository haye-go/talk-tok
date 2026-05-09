import { QRCodeSVG } from "qrcode.react";
import { Lightning, PushPin, Swords, Timer, Warning } from "@phosphor-icons/react";
import { useParams } from "@tanstack/react-router";
import { useMutation } from "convex/react";
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
import { useInstructorOverview } from "@/hooks/use-instructor-overview";
import { categoryColorToTone } from "@/lib/category-colors";
import { inputPatternLabel, type InputPattern } from "@/lib/submission-telemetry";
import { routes } from "@/lib/routes";

export function InstructorSessionPage() {
  const { sessionSlug } = useParams({ from: "/instructor/session/$sessionSlug" });
  const overview = useInstructorOverview(sessionSlug);
  const triggerCategorisation = useMutation(api.categorisation.triggerForSession);
  const updatePhase = useMutation(api.instructorControls.updatePhase);

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
        <ErrorState title="Session not found" description="This instructor session URL does not match an existing session." />
      </main>
    );
  }

  const { session, presenceAggregate, submissionAggregate, categories, uncategorizedCount, pendingRecategorisationCount, recentSubmissions, recentAuditEvents, followUpSummary } = overview;

  const joinPath = routes.join(session.joinCode);
  const joinUrl = typeof window === "undefined" ? joinPath : new URL(joinPath, window.location.origin).toString();

  const patternCounts = submissionAggregate.byInputPattern as Record<InputPattern, number>;
  const activeCategories = categories.filter((c) => c.status === "active");

  const PHASE_ORDER = ["lobby", "submit", "discover", "challenge", "synthesize", "closed"] as const;
  const ACT_FOR_PHASE: Record<string, string> = { lobby: "submit", submit: "submit", discover: "discover", challenge: "challenge", synthesize: "synthesize", closed: "synthesize" };

  function advancePhase() {
    const idx = PHASE_ORDER.indexOf(session.phase as typeof PHASE_ORDER[number]);
    const next = PHASE_ORDER[Math.min(idx + 1, PHASE_ORDER.length - 1)];
    void updatePhase({ sessionSlug, phase: next, currentAct: ACT_FOR_PHASE[next] });
  }

  function retreatPhase() {
    const idx = PHASE_ORDER.indexOf(session.phase as typeof PHASE_ORDER[number]);
    const prev = PHASE_ORDER[Math.max(idx - 1, 0)];
    void updatePhase({ sessionSlug, phase: prev, currentAct: ACT_FOR_PHASE[prev] });
  }

  return (
    <InstructorShell
      sessionTitle={session.title}
      participantCount={session.participantCount}
      actIndex={PHASE_ORDER.indexOf(session.phase as typeof PHASE_ORDER[number]) - 1}
      onPreviousAct={retreatPhase}
      onNextAct={advancePhase}
      left={
        <div className="grid gap-3">
          {/* Real category board */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--c-muted)]">Categories ({activeCategories.length})</span>
            <a href="#" className="text-xs text-[var(--c-link)]">+ Add</a>
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
                  {cat.description.slice(0, 60)}{cat.description.length > 60 ? "..." : ""}
                </p>
              )}
              <div className="mt-1.5 flex gap-1">
                <span className="cursor-pointer rounded bg-[var(--c-surface-strong)] px-1.5 py-0.5 text-[9px]">Rename</span>
                <span className="cursor-pointer rounded bg-[var(--c-surface-strong)] px-1.5 py-0.5 text-[9px]">Split</span>
                <span className="cursor-pointer rounded bg-[var(--c-surface-strong)] px-1.5 py-0.5 text-[9px]"><PushPin size={9} className="inline" /></span>
                <span className="cursor-pointer rounded bg-[var(--c-sig-slate)] px-1.5 py-0.5 text-[9px] text-white">Follow-up</span>
              </div>
            </div>
          ))}

          {uncategorizedCount > 0 && (
            <div className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-2.5" style={{ borderLeft: "3px solid var(--c-muted)" }}>
              <div className="flex items-center justify-between">
                <strong className="text-xs text-[var(--c-muted)]">Uncategorized</strong>
                <span className="text-[10px] text-[var(--c-muted)]">{uncategorizedCount}</span>
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
              <div className="rounded-md bg-white p-3"><QRCodeSVG value={joinUrl} size={140} /></div>
              <p className="break-all text-[10px] text-[var(--c-muted)]">{joinUrl}</p>
              <Button type="button" variant="secondary" size="sm" onClick={() => (window.location.href = routes.instructorProjector(session.slug))}>
                Open projector
              </Button>
            </div>
          </Card>
        </div>
      }
      center={
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <MetricTile label="Submitted" value={String(submissionAggregate.total)} />
            <MetricTile label="Categories" value={String(activeCategories.length)} />
            <MetricTile label="Recat Req" value={String(pendingRecategorisationCount)} />
            <MetricTile label="Follow-ups" value={String(followUpSummary?.activeCount ?? 0)} />
          </div>

          <PresenceBar
            typing={presenceAggregate.typing}
            submitted={presenceAggregate.submitted}
            idle={presenceAggregate.idle}
          />

          {/* Consensus pulse placeholder (needs real data from later phase) */}
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
                  <span className="font-mono text-xs text-[var(--c-ink)]">{patternCounts[pattern]}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Recent Submissions">
            <div className="grid gap-3">
              {recentSubmissions.length === 0 && <p className="text-sm text-[var(--c-muted)]">No submissions yet.</p>}
              {recentSubmissions.slice(0, 8).map((sub) => (
                <SubmissionCard key={sub.id} submission={sub} />
              ))}
            </div>
          </Card>
        </div>
      }
      right={
        <div className="grid gap-3">
          <p className="text-xs text-[var(--c-muted)]">Live Activity</p>
          {recentAuditEvents.length === 0 && <p className="text-sm text-[var(--c-muted)]">No activity yet.</p>}
          {recentAuditEvents.map((event) => (
            <div key={event.id} className="border-b border-[var(--c-hairline)] pb-2 text-xs text-[var(--c-body)]">
              <span
                className="mr-1.5 inline-block h-2 w-2 rounded-full"
                style={{
                  background:
                    event.action.includes("fight") ? "var(--c-sig-coral)"
                    : event.action.includes("recat") ? "var(--c-sig-yellow)"
                    : event.action.includes("follow") ? "var(--c-sig-peach)"
                    : "var(--c-sig-sky)",
                }}
              />
              <strong>{event.actorType}</strong>{" "}
              {event.action.replace(/_/g, " ")}
              {event.targetType && <span className="text-[var(--c-muted)]"> on {event.targetType}</span>}
              <span className="ml-1.5 text-[10px] text-[var(--c-muted)]">
                {new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      }
    />
  );
}
