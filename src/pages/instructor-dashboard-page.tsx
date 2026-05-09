import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ThemeToggle } from "@/components/theme-toggle";
import { EmptyState } from "@/components/state/empty-state";
import { LoadingState } from "@/components/state/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { routes } from "@/lib/routes";

export function InstructorDashboardPage() {
  const sessions = useQuery(api.sessions.listForInstructor);

  return (
    <main className="min-h-dvh bg-[var(--c-canvas)] p-6">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-medium text-[var(--c-ink)]">
              Instructor Dashboard
            </h1>
            <p className="text-sm text-[var(--c-muted)]">Create and reopen live sessions.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => (window.location.href = routes.instructorSessionNew())}
            >
              New session
            </Button>
            <ThemeToggle />
          </div>
        </header>
        {sessions === undefined ? <LoadingState label="Loading sessions..." /> : null}
        {sessions?.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            description="Create the first live discussion session to generate a readable slug and join code."
            action={
              <Button
                type="button"
                onClick={() => (window.location.href = routes.instructorSessionNew())}
              >
                Create session
              </Button>
            }
          />
        ) : null}
        {sessions && sessions.length > 0 ? (
          <div className="grid gap-4">
            {sessions.map((session) => (
              <Card
                key={session.slug}
                title={session.title}
                eyebrow={`${session.joinCode} - ${session.currentAct}`}
                action={
                  <Button
                    type="button"
                    onClick={() => (window.location.href = routes.instructorSession(session.slug))}
                  >
                    Open
                  </Button>
                }
              >
                <p className="line-clamp-2 text-sm text-[var(--c-body)]">{session.openingPrompt}</p>
                <p className="mt-3 text-xs text-[var(--c-muted)]">
                  {session.participantCount ?? 0} participants - /session/{session.slug}
                </p>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
