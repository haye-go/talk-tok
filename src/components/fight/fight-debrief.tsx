import { Crosshair, Muscle, Wrench } from "@phosphor-icons/react";

interface FightDebriefProps {
  defended: string;
  weaker: string;
  stronger: string;
}

export function FightDebrief({ defended, weaker, stronger }: FightDebriefProps) {
  return (
    <div className="space-y-2.5">
      <div className="rounded-md p-3" style={{ background: "oklch(0.93 0.025 145)" }}>
        <p className="mb-1 font-display text-xs font-semibold text-[var(--c-success)]">
          <Muscle size={12} className="mr-0.5 inline" /> What you defended well
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "oklch(0.25 0.02 145)" }}>
          {defended}
        </p>
      </div>

      <div className="rounded-md bg-[var(--c-sig-cream)] p-3">
        <p className="mb-1 font-display text-xs font-semibold text-[var(--c-sig-mustard)]">
          <Wrench size={12} className="mr-0.5 inline" /> What could be stronger
        </p>
        <p className="text-xs leading-relaxed text-[var(--c-on-sig-light-body)]">{weaker}</p>
      </div>

      <div className="rounded-md bg-[var(--c-sig-sky)] p-3">
        <p className="mb-1 font-display text-xs font-semibold text-[var(--c-sig-slate)]">
          <Crosshair size={12} className="mr-0.5 inline" /> A stronger rebuttal might include
        </p>
        <p className="text-xs leading-relaxed text-[var(--c-on-sig-light-body)]">{stronger}</p>
      </div>
    </div>
  );
}
