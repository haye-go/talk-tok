import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export interface ProjectorShellProps {
  sessionTitle: string;
  joinCode: string;
  joinUrl: string;
  currentAct: string;
  qrCode?: ReactNode;
}

export function ProjectorShell({
  sessionTitle,
  joinCode,
  joinUrl,
  currentAct,
  qrCode,
}: ProjectorShellProps) {
  return (
    <main className="min-h-dvh bg-[var(--c-canvas)] p-8 text-[var(--c-ink)]">
      <div className="mx-auto grid max-w-6xl gap-8">
        <section className="rounded-lg bg-[var(--c-sig-slate)] p-8 text-white sig-dark">
          <Badge tone="warning">Projector View</Badge>
          <h1 className="mt-4 font-display text-5xl font-medium">{sessionTitle}</h1>
          <p className="mt-3 text-3xl">Join code: {joinCode}</p>
          <p className="mt-2 break-all text-sm opacity-80">{joinUrl}</p>
          {qrCode ? (
            <div className="mt-6 inline-block rounded-md bg-white p-4">{qrCode}</div>
          ) : null}
        </section>
        <div className="grid gap-6 md:grid-cols-2">
          <Card title="Top Categories" className="text-xl">
            Categories appear after categorisation starts in Phase 03.
          </Card>
          <Card title="Current Act" className="text-xl">
            {currentAct}: live session state.
          </Card>
        </div>
      </div>
    </main>
  );
}
