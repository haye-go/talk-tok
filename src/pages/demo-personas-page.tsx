import { ArrowLeft, ArrowRight, UserCircle } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/state/loading-state";
import { ErrorState } from "@/components/state/error-state";
import { setDemoClientKey, storeParticipant } from "@/lib/client-identity";
import { routes } from "@/lib/routes";

export function DemoPersonasPage() {
  const data = useQuery(api.demo.listDemoPersonas);

  if (data === undefined) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
        <LoadingState label="Loading demo personas..." className="w-full max-w-md" />
      </main>
    );
  }

  if (!data.session) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
        <ErrorState
          title="No demo session"
          description="The demo session has not been seeded yet. Ask an instructor to seed the demo from the admin panel."
        />
      </main>
    );
  }

  const { session, personas } = data;

  function handlePickPersona(persona: (typeof personas)[number]) {
    setDemoClientKey(persona.demoClientKey);
    storeParticipant({
      sessionSlug: session!.slug,
      participantSlug: persona.participantSlug,
      nickname: persona.nickname,
    });
    window.location.href = routes.session(session!.slug);
  }

  function personaHref(persona: (typeof personas)[number]) {
    const params = new URLSearchParams({ demoClientKey: persona.demoClientKey });
    return `${routes.session(session.slug)}?${params.toString()}`;
  }

  return (
    <main className="min-h-dvh bg-[var(--c-canvas)]">
      <div className="flex items-center justify-between border-b border-[var(--c-hairline)] px-6 py-4">
        <a href={routes.home()} className="flex items-center gap-3 no-underline">
          <img src="/favicon.svg" alt="" className="h-10 w-10" />
          <span className="font-display text-2xl font-semibold text-[var(--c-ink)]">TalkTok</span>
        </a>
        <ButtonLink
          href={routes.home()}
          variant="secondary"
          size="sm"
          icon={<ArrowLeft size={14} />}
        >
          Home
        </ButtonLink>
      </div>
      <div className="mx-auto grid max-w-3xl gap-6 p-6">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--c-muted)]">
            Demo Session
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium text-[var(--c-ink)]">
            {session.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--c-body)]">
            Join code:{" "}
            <span className="font-display font-semibold tracking-widest">{session.joinCode}</span>
          </p>
        </header>

        <p className="text-sm text-[var(--c-body)]">
          Pick a persona to explore the demo from their perspective. Each persona has pre-seeded
          submissions, feedback, and Fight Me debates.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {personas.map((p) => (
            <Card key={p.nickname} className="flex flex-col justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <UserCircle size={24} className="text-[var(--c-primary)]" weight="duotone" />
                  <span className="font-display text-base font-semibold text-[var(--c-ink)]">
                    {p.nickname}
                  </span>
                </div>
                <p className="mb-2 text-xs leading-relaxed text-[var(--c-body)]">
                  {p.courseIdea.length > 80 ? `${p.courseIdea.slice(0, 80)}...` : p.courseIdea}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge tone="slate" className="text-[9px]">
                    {p.categorySlug.replace(/-/g, " ")}
                  </Badge>
                  <Badge tone="neutral" className="text-[9px]">
                    {p.inputPattern}
                  </Badge>
                </div>
              </div>
              <ButtonLink
                href={personaHref(p)}
                size="sm"
                className="mt-3 w-full"
                icon={<ArrowRight size={12} />}
                onClick={() => handlePickPersona(p)}
              >
                Enter as {p.nickname}
              </ButtonLink>
            </Card>
          ))}
        </div>

        <div className="border-t border-[var(--c-hairline)] pt-4">
          <ButtonLink href={routes.join(session.joinCode)} variant="secondary">
            Join as yourself instead
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
