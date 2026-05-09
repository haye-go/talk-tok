import { CircleNotch, Crosshair, HandFist, Sparkle, Wrench } from "@phosphor-icons/react";

interface FightDebriefProps {
  status: "queued" | "processing" | "success" | "error";
  summary?: string | null;
  attackerStrength?: string | null;
  defenderStrength?: string | null;
  strongerRebuttal?: string | null;
  nextPractice?: string | null;
  error?: string | null;
}

export function FightDebrief({
  status,
  summary,
  attackerStrength,
  defenderStrength,
  strongerRebuttal,
  nextPractice,
  error,
}: FightDebriefProps) {
  if (status === "queued" || status === "processing") {
    return (
      <div className="flex items-center gap-3 rounded-md bg-[var(--c-surface-soft)] p-4">
        <CircleNotch size={18} className="animate-spin text-[var(--c-sig-peach)]" />
        <div>
          <p className="font-display text-xs font-medium text-[var(--c-ink)]">
            Generating debrief...
          </p>
          <p className="text-[10px] text-[var(--c-muted)]">AI is analyzing the debate</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="rounded-md bg-[var(--c-surface-soft)] p-4"
        style={{ borderLeft: "3px solid var(--c-error)" }}
      >
        <p className="font-display text-xs font-medium text-[var(--c-ink)]">Debrief failed</p>
        <p className="text-[10px] text-[var(--c-muted)]">{error ?? "An error occurred."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {summary && (
        <div className="rounded-md bg-[var(--c-surface-soft)] p-3">
          <p className="mb-1 font-display text-xs font-semibold text-[var(--c-ink)]">
            <Sparkle size={12} className="mr-0.5 inline" /> Summary
          </p>
          <p className="text-xs leading-relaxed text-[var(--c-body)]">{summary}</p>
        </div>
      )}

      {attackerStrength && (
        <div className="rounded-md p-3" style={{ background: "oklch(0.93 0.025 145)" }}>
          <p className="mb-1 font-display text-xs font-semibold text-[var(--c-success)]">
            <HandFist size={12} className="mr-0.5 inline" /> Attacker strength
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "oklch(0.25 0.02 145)" }}>
            {attackerStrength}
          </p>
        </div>
      )}

      {defenderStrength && (
        <div className="rounded-md bg-[var(--c-sig-cream)] p-3">
          <p className="mb-1 font-display text-xs font-semibold text-[var(--c-sig-mustard)]">
            <Wrench size={12} className="mr-0.5 inline" /> Defender strength
          </p>
          <p className="text-xs leading-relaxed text-[var(--c-on-sig-light-body)]">
            {defenderStrength}
          </p>
        </div>
      )}

      {strongerRebuttal && (
        <div className="rounded-md bg-[var(--c-sig-sky)] p-3">
          <p className="mb-1 font-display text-xs font-semibold text-[var(--c-sig-slate)]">
            <Crosshair size={12} className="mr-0.5 inline" /> Stronger rebuttal
          </p>
          <p className="text-xs leading-relaxed text-[var(--c-on-sig-light-body)]">
            {strongerRebuttal}
          </p>
        </div>
      )}

      {nextPractice && (
        <div className="rounded-md bg-[var(--c-surface-soft)] p-3">
          <p className="mb-1 font-display text-xs font-semibold text-[var(--c-link)]">
            Next time, try...
          </p>
          <p className="text-xs leading-relaxed text-[var(--c-body)]">{nextPractice}</p>
        </div>
      )}
    </div>
  );
}
