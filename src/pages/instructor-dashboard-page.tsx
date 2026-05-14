import { ArrowSquareOut, Plus, SlidersHorizontal } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { InstructorBrandBar } from "@/components/layout/instructor-brand-bar";
import { EmptyState } from "@/components/state/empty-state";
import { LoadingState } from "@/components/state/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export function InstructorDashboardPage() {
  const navigate = useNavigate();
  const sessions = useQuery(api.sessions.listForInstructor);

  return (
    <div className="min-h-dvh bg-[var(--c-canvas)]">
      <InstructorBrandBar />
      <main className="p-6">
        <div className="mx-auto grid max-w-5xl gap-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-medium text-[var(--c-ink)]">
                Instructor Dashboard
              </h1>
              <p className="text-sm text-[var(--c-muted)]">Create and reopen live sessions.</p>
            </div>
            <Button
              type="button"
              icon={<Plus size={16} />}
              onClick={() => void navigate({ to: routes.instructorSessionNew() })}
            >
              New session
            </Button>
          </header>
          {sessions === undefined ? <LoadingState label="Loading sessions..." /> : null}
          {sessions?.length === 0 ? (
            <EmptyState
              title="No sessions yet"
              description="Create the first live discussion session to generate a readable slug and join code."
              action={
                <Button
                  type="button"
                  onClick={() => void navigate({ to: routes.instructorSessionNew() })}
                >
                  Create session
                </Button>
              }
            />
          ) : null}
          {sessions && sessions.length > 0 ? (
            <div className="grid gap-4">
              {sessions.map((session) => (
                <div
                  key={session.slug}
                  className="flex items-start justify-between gap-4 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-display text-base font-medium text-[var(--c-ink)]">
                        {session.title}
                      </h2>
                      <Badge tone="sky">{session.currentAct}</Badge>
                      <Badge tone="slate">{session.joinCode}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--c-body)]">
                      {session.openingPrompt}
                    </p>
                    <p className="mt-2 text-xs text-[var(--c-muted)]">
                      {session.participantCount ?? 0} participants
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="secondary"
                      icon={<SlidersHorizontal size={16} />}
                      onClick={() =>
                        void navigate({ to: routes.instructorSessionSetup(session.slug) })
                      }
                    >
                      Open Setup
                    </Button>
                    <Button
                      type="button"
                      icon={<ArrowSquareOut size={16} />}
                      onClick={() =>
                        void navigate({ to: routes.instructorSessionRoom(session.slug) })
                      }
                    >
                      Open Room
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
