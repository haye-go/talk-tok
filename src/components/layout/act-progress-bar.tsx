import { ACTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface ActProgressBarProps {
  actIndex: number;
  className?: string;
}

export function ActProgressBar({ actIndex, className }: ActProgressBarProps) {
  const safeIndex = Math.min(Math.max(actIndex, 0), ACTS.length - 1);
  const act = ACTS[safeIndex];

  return (
    <div className={cn("border-b border-[var(--c-hairline)] bg-[var(--c-canvas)]", className)}>
      <div className="flex gap-1 px-4 pt-2.5">
        {ACTS.map((item, index) => (
          <div
            key={item.id}
            data-segment
            data-filled={index <= safeIndex ? "true" : "false"}
            className="h-1 flex-1 rounded-pill bg-[var(--c-hairline)] transition-colors"
            style={index <= safeIndex ? { backgroundColor: act.color } : undefined}
          />
        ))}
      </div>
      <div className="px-4 py-2 text-xs text-[var(--c-muted)]">
        Act {safeIndex + 1} · <strong className="text-[var(--c-ink)]">{act.label}</strong> —{" "}
        {act.subtitle}
      </div>
    </div>
  );
}
