import { ArrowRight, QrCode } from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DEMO_SESSION_CODE, DEMO_SESSION_SLUG } from "@/lib/constants";
import { routes } from "@/lib/routes";

const checkpoints = [
  "VitePlus + React app scaffolded",
  "Readable route slugs wired",
  "Convex provider activates when VITE_CONVEX_URL exists",
  "Design-system shell ready for UI designer handoff",
];

export function HomePage() {
  return (
    <main className="min-h-dvh bg-[var(--c-canvas)] p-6">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header className="flex items-center justify-between">
          <Badge tone="slate">TalkTok</Badge>
          <ThemeToggle />
        </header>
        <section className="rounded-lg border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--c-muted)]">
            Discussion Open
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-5xl font-medium leading-none text-[var(--c-ink)]">
            Live discussion intelligence foundation
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--c-body)]">
            Engineering shells and route contracts are in place. Detailed screen polish remains with
            the UI designer.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              icon={<QrCode size={18} />}
              onClick={() => (window.location.href = routes.join(DEMO_SESSION_CODE))}
            >
              Join demo
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={<ArrowRight size={18} />}
              onClick={() => (window.location.href = routes.instructorSession(DEMO_SESSION_SLUG))}
            >
              Instructor shell
            </Button>
          </div>
        </section>
        <section className="grid gap-3 md:grid-cols-2">
          {checkpoints.map((item) => (
            <Card key={item}>{item}</Card>
          ))}
        </section>
      </div>
    </main>
  );
}
