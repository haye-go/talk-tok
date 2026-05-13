import type { ReactNode } from "react";
import { InstructorTopBar } from "@/components/layout/instructor-top-bar";

export interface InstructorShellProps {
  sessionTitle?: string;
  sessionCode?: string;
  participantCount?: number;
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
  left,
  center,
  right,
  sidebar,
  main,
  rail,
}: InstructorShellProps) {
  const resolvedSidebar = sidebar ?? left;
  const resolvedMain = main ?? center;
  const resolvedRail = rail ?? right;

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--c-canvas)]">
      <InstructorTopBar
        sessionTitle={sessionTitle}
        sessionCode={sessionCode}
        participantCount={participantCount}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[226px_minmax(0,1fr)_314px]">
        <aside className="min-h-0 overflow-y-auto border-b border-[#223a54] bg-[#12263a] text-[#d9e7f3] lg:border-b-0 lg:border-r">
          {resolvedSidebar}
        </aside>
        <main className="min-h-0 overflow-y-auto bg-gradient-to-b from-[var(--c-surface-soft)] to-[var(--c-canvas)]">
          {resolvedMain}
        </main>
        <aside className="min-h-0 overflow-y-auto border-t border-[var(--c-hairline)] bg-[var(--c-surface-soft)] lg:border-l lg:border-t-0">
          {resolvedRail}
        </aside>
      </div>
    </div>
  );
}
