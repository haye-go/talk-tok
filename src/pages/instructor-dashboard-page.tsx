import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DEMO_SESSION_SLUG } from "@/lib/constants";
import { routes } from "@/lib/routes";

export function InstructorDashboardPage() {
  return (
    <main className="min-h-dvh bg-[var(--c-canvas)] p-6">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-medium text-[var(--c-ink)]">
              Instructor Dashboard
            </h1>
            <p className="text-sm text-[var(--c-muted)]">Session list placeholder.</p>
          </div>
          <ThemeToggle />
        </header>
        <Card
          title="Ethics of AI in Healthcare"
          action={
            <Button
              type="button"
              onClick={() => (window.location.href = routes.instructorSession(DEMO_SESSION_SLUG))}
            >
              Open
            </Button>
          }
        >
          Demo session card. Creation, templates, and duplication come in the next phase.
        </Card>
      </div>
    </main>
  );
}
