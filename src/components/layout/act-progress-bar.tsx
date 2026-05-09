import { ACTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ActId } from "@/lib/constants";

export interface ActProgressBarProps {
  actIndex: number;
  className?: string;
  selectable?: boolean;
  onActSelect?: (actId: ActId) => void;
}

export function ActProgressBar({
  actIndex,
  className,
  selectable = false,
  onActSelect,
}: ActProgressBarProps) {
  const safeIndex = Math.min(Math.max(actIndex, 0), ACTS.length - 1);
  const act = ACTS[safeIndex];

  return (
    <div className={cn("border-b border-[var(--c-hairline)] bg-[var(--c-canvas)]", className)}>
      <div className="flex gap-1 px-4 pt-2.5">
        {ACTS.map((item, index) => {
          const segment = (
            <span
              data-segment
              data-filled={index <= safeIndex ? "true" : "false"}
              className="block h-1 w-full rounded-pill bg-[var(--c-hairline)] transition-colors"
              style={index <= safeIndex ? { backgroundColor: act.color } : undefined}
            />
          );

          if (!selectable) {
            return (
              <div key={item.id} className="flex-1">
                {segment}
              </div>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              className="flex flex-1 cursor-pointer items-center rounded-pill py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-info-border)]"
              aria-label={`Switch to Act ${index + 1}: ${item.label}`}
              aria-current={index === safeIndex ? "step" : undefined}
              onClick={() => onActSelect?.(item.id)}
            >
              {segment}
            </button>
          );
        })}
      </div>
      <div className="px-4 py-2 text-xs text-[var(--c-muted)]">
        Act {safeIndex + 1} - <strong className="text-[var(--c-ink)]">{act.label}</strong>:{" "}
        {act.subtitle}
      </div>
    </div>
  );
}
