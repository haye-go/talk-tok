import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export interface ProjectorShellProps {
  sessionTitle: string;
  joinCode: string;
  joinUrl: string;
  currentAct: string;
  currentQuestionTitle?: string | null;
  currentQuestionPrompt?: string | null;
  categoryNames?: string[];
  qrCode?: ReactNode;
}

export function ProjectorShell({
  sessionTitle,
  joinCode,
  joinUrl,
  currentAct,
  currentQuestionTitle,
  currentQuestionPrompt,
  categoryNames,
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
          <Card title={currentQuestionTitle ?? "Current Question"} className="text-xl">
            {currentQuestionPrompt ? (
              <p className="text-base leading-relaxed text-[var(--c-body)]">
                {currentQuestionPrompt}
              </p>
            ) : (
              <p className="text-base text-[var(--c-muted)]">
                No current question is active for this session yet.
              </p>
            )}
          </Card>
          <Card title="Visible Categories" className="text-xl">
            {categoryNames && categoryNames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {categoryNames.map((categoryName) => (
                  <Badge key={categoryName} tone="sky">
                    {categoryName}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-base text-[var(--c-muted)]">
                No active categories are visible for the current question yet.
              </p>
            )}
          </Card>
          <Card title="Session State" className="text-xl md:col-span-2">
            <p className="text-base text-[var(--c-body)]">{currentAct}: live session state.</p>
          </Card>
        </div>
      </div>
    </main>
  );
}
