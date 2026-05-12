import type { ReactNode } from "react";
import { InstructorTopBar } from "@/components/layout/instructor-top-bar";
import { useAct } from "@/hooks/use-act";

export interface InstructorShellProps {
  sessionTitle?: string;
  sessionCode?: string;
  participantCount?: number;
  actIndex?: number;
  onPreviousAct?: () => void;
  onNextAct?: () => void;
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  sidebar?: ReactNode;
  main?: ReactNode;
  rail?: ReactNode;
}

export function InstructorShell({
  sessionTitle = "Session",
  sessionCode,
  participantCount = 0,
  actIndex,
  onPreviousAct,
  onNextAct,
  left,
  center,
  right,
  sidebar,
  main,
  rail,
}: InstructorShellProps) {
  const fallbackAct = useAct();
  const resolvedSidebar = sidebar ?? left;
  const resolvedMain = main ?? center;
  const resolvedRail = rail ?? right;

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--c-canvas)]">
      <InstructorTopBar
        sessionTitle={sessionTitle}
        sessionCode={sessionCode}
        participantCount={participantCount}
        actIndex={actIndex ?? fallbackAct.actIndex}
        onPreviousAct={onPreviousAct ?? fallbackAct.goBackAct}
        onNextAct={onNextAct ?? fallbackAct.advanceAct}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[220px_minmax(0,1fr)_320px] xl:grid-cols-[240px_minmax(0,1fr)_340px]">
        <aside className="min-h-0 overflow-y-auto border-b border-[var(--c-hairline)] bg-[var(--c-ink)] text-[var(--c-canvas)] lg:border-b-0 lg:border-r lg:border-[color-mix(in_oklch,var(--c-canvas),transparent_88%)]">
          {resolvedSidebar}
        </aside>
        <main className="min-h-0 overflow-y-auto bg-[var(--c-canvas)]">{resolvedMain}</main>
        <aside className="min-h-0 overflow-y-auto border-t border-[var(--c-hairline)] bg-[var(--c-surface-soft)] lg:border-l lg:border-t-0 lg:border-[var(--c-hairline)]">
          {resolvedRail}
        </aside>
      </div>
    </div>
  );
}
