import { ArrowRight, Play, Users } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { DEMO_SESSION_SLUG } from "@/lib/constants";
import { routes } from "@/lib/routes";

export function HomePage() {
  const demoSession = useQuery(api.demo.getDemoSession);

  return (
    <main className="min-h-dvh bg-[var(--c-canvas)] p-6">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="" className="h-12 w-12" />
            <span className="font-display text-3xl font-semibold text-[var(--c-ink)]">TalkTok</span>
          </div>
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
            <ButtonLink
              href={routes.joinEntry()}
              variant="secondary"
              icon={<ArrowRight size={18} />}
            >
              Join discussion
            </ButtonLink>
            <ButtonLink
              href={routes.instructor()}
              variant="secondary"
              icon={<ArrowRight size={18} />}
            >
              Instructor dashboard
            </ButtonLink>
          </div>
        </section>
        {demoSession && (
          <section className="rounded-lg border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-6">
            <div className="mb-1 flex items-center gap-2">
              <Badge tone="coral">Demo</Badge>
              <span className="font-display text-sm font-semibold tracking-widest text-[var(--c-muted)]">
                {demoSession.joinCode}
              </span>
            </div>
            <p className="mb-4 text-sm text-[var(--c-body)]">{demoSession.title}</p>
            <div className="flex flex-wrap gap-2">
              <ButtonLink
                href={routes.demoPersonas()}
                size="sm"
                variant="secondary"
                icon={<Users size={14} />}
              >
                Try as Student
              </ButtonLink>
              <ButtonLink
                href={routes.instructorSession(DEMO_SESSION_SLUG)}
                size="sm"
                variant="secondary"
                icon={<Play size={14} />}
              >
                Instructor view
              </ButtonLink>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
