import { cn } from "@/lib/utils";

type PresenceState = "typing" | "submitted" | "idle" | "offline";

export interface PresenceRailCardProps {
  connected: number;
  active: number;
  idle: number;
  samples: ReadonlyArray<{
    participantSlug: string;
    nickname: string;
    state: PresenceState;
  }>;
  total: number;
}

export function PresenceRailCard({
  connected,
  active,
  idle,
  samples,
  total,
}: PresenceRailCardProps) {
  const overflow = Math.max(0, total - samples.length);

  return (
    <section className="rounded-2xl border border-[#dbe5ef] bg-white/75 p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">
        Presence
      </p>
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--c-success)]" />
        <span className="text-sm font-semibold text-[var(--c-ink)]">{connected} connected</span>
        <span className="text-[10px] text-[var(--c-muted)]">
          · {active} active · {idle} idle
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {samples.map((person) => (
          <span
            key={person.participantSlug}
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              person.state === "idle"
                ? "bg-[#edf2f7] text-[var(--c-muted)]"
                : "bg-[#dff6f0] text-[#0f766e]",
            )}
          >
            {person.nickname}
          </span>
        ))}
        {overflow > 0 ? (
          <span className="text-[10px] text-[var(--c-muted)]">+{overflow} more</span>
        ) : null}
      </div>
    </section>
  );
}
