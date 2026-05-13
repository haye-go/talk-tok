import { Card } from "@/components/ui/card";
import {
  SessionControlsCard,
  type SessionControlSnapshot,
  type SessionSettingsUpdate,
  type VisibilityMode,
} from "@/components/instructor/session-controls-card";

function getSessionControlsKey(session: SessionControlSnapshot) {
  return [
    session.title,
    session.openingPrompt,
    session.phase,
    session.visibilityMode,
    session.anonymityMode,
    session.responseSoftLimitWords,
    session.categorySoftCap,
    session.critiqueToneDefault,
    session.telemetryEnabled,
    session.fightMeEnabled,
    session.summaryGateEnabled,
  ].join("|");
}

interface QuestionManagerPanelProps {
  session: SessionControlSnapshot & { joinCode: string };
  currentQuestion?: {
    title: string;
    prompt: string;
    status: string;
    isCurrent: boolean;
  } | null;
  metrics: {
    submitted: number;
    categories: number;
    recategorisationRequests: number;
    followUps: number;
  };
  onVisibilityChange: (visibilityMode: VisibilityMode) => Promise<void>;
  onSettingsSave: (settings: SessionSettingsUpdate) => Promise<void>;
}

export function QuestionManagerPanel({
  session,
  currentQuestion,
  metrics,
  onVisibilityChange,
  onSettingsSave,
}: QuestionManagerPanelProps) {
  return (
    <div className="grid gap-4">
      <Card
        title={currentQuestion?.title ?? "Current Question"}
        eyebrow={session.joinCode}
      >
        <p className="text-sm leading-6 text-[var(--c-body)]">
          {currentQuestion?.prompt ?? session.openingPrompt}
        </p>
        <p className="mt-2 text-[11px] text-[var(--c-muted)]">
          AI controls target this question unless a panel explicitly says otherwise.
        </p>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-[var(--c-hairline)] pt-3 text-xs">
          <span>
            <strong className="text-[var(--c-ink)]">{metrics.submitted}</strong>{" "}
            <span className="text-[var(--c-muted)]">submitted</span>
          </span>
          <span aria-hidden className="text-[var(--c-muted)]">·</span>
          <span>
            <strong className="text-[var(--c-ink)]">{metrics.categories}</strong>{" "}
            <span className="text-[var(--c-muted)]">categories</span>
          </span>
          <span aria-hidden className="text-[var(--c-muted)]">·</span>
          <span>
            <strong className="text-[var(--c-ink)]">{metrics.recategorisationRequests}</strong>{" "}
            <span className="text-[var(--c-muted)]">recat pending</span>
          </span>
          <span aria-hidden className="text-[var(--c-muted)]">·</span>
          <span>
            <strong className="text-[var(--c-ink)]">{metrics.followUps}</strong>{" "}
            <span className="text-[var(--c-muted)]">follow-ups</span>
          </span>
        </div>
      </Card>

      <SessionControlsCard
        key={getSessionControlsKey(session)}
        session={session}
        onVisibilityChange={onVisibilityChange}
        onSettingsSave={onSettingsSave}
      />
    </div>
  );
}
