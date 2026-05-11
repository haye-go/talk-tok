import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
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
    <div className="grid gap-3">
      <Card title={currentQuestion?.title ?? "Current Question"} eyebrow={session.joinCode}>
        <p className="text-sm leading-relaxed text-[var(--c-body)]">
          {currentQuestion?.prompt ?? session.openingPrompt}
        </p>
        <p className="mt-2 text-[10px] text-[var(--c-muted)]">
          AI controls target this question unless a panel explicitly says otherwise.
        </p>
      </Card>

      <SessionControlsCard
        key={getSessionControlsKey(session)}
        session={session}
        onVisibilityChange={onVisibilityChange}
        onSettingsSave={onSettingsSave}
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MetricTile label="Submitted" value={String(metrics.submitted)} />
        <MetricTile label="Categories" value={String(metrics.categories)} />
        <MetricTile label="Recat Req" value={String(metrics.recategorisationRequests)} />
        <MetricTile label="Follow-ups" value={String(metrics.followUps)} />
      </div>
    </div>
  );
}
