import type { ReactNode } from "react";
import { InstructorTopBar } from "@/components/layout/instructor-top-bar";
import { ThreePanelLayout } from "@/components/layout/three-panel-layout";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { useAct } from "@/hooks/use-act";

export interface InstructorShellProps {
  sessionTitle?: string;
  participantCount?: number;
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
}

export function InstructorShell({
  sessionTitle = "Session",
  participantCount = 0,
  left,
  center,
  right,
}: InstructorShellProps) {
  const { actIndex, advanceAct, goBackAct } = useAct();

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--c-canvas)]">
      <InstructorTopBar
        sessionTitle={sessionTitle}
        participantCount={participantCount}
        actIndex={actIndex}
        onPreviousAct={goBackAct}
        onNextAct={advanceAct}
      />
      <ThreePanelLayout
        left={left ?? <Card title="Categories">Category board placeholder.</Card>}
        center={
          center ?? (
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <MetricTile label="Submitted" value="24/28" detail="Live placeholder" />
                <MetricTile label="Originality" value="67%" detail="Aggregate placeholder" />
                <MetricTile label="Recat Req" value="3" detail="Queue placeholder" />
              </div>
              <Card title="Consensus Pulse">CSS/card visualization placeholder for MVP.</Card>
            </div>
          )
        }
        right={right ?? <Card title="Activity Feed">Live event stream placeholder.</Card>}
      />
    </div>
  );
}
