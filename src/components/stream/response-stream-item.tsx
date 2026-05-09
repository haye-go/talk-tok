import { Lightning, Sparkle, Timer } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ResponseStreamItemProps {
  nickname: string;
  text: string;
  categoryColor: NonNullable<BadgeProps["tone"]>;
  categoryName?: string;
  originality?: string;
  telemetryLabel?: string;
  telemetryWarning?: boolean;
  isOwn?: boolean;
  className?: string;
}

export function ResponseStreamItem({
  nickname,
  text,
  categoryColor,
  categoryName,
  originality,
  telemetryLabel,
  telemetryWarning,
  isOwn,
  className,
}: ResponseStreamItemProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3",
        isOwn && "border-l-[3px] border-l-[var(--c-sig-sky)]",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <strong className="font-display text-xs text-[var(--c-ink)]">
          {isOwn ? "You" : nickname}
        </strong>
        {categoryName && (
          <Badge tone={categoryColor} className="text-[9px]">
            {categoryName}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[var(--c-body)]">{text}</p>
      <div className="mt-1.5 flex items-center justify-between text-[10px]">
        {telemetryLabel && (
          <span
            className={telemetryWarning ? "text-[var(--c-sig-coral)]" : "text-[var(--c-muted)]"}
          >
            {telemetryWarning ? (
              <Lightning size={10} className="mr-0.5 inline" />
            ) : (
              <Timer size={10} className="mr-0.5 inline" />
            )}
            {telemetryLabel}
          </span>
        )}
        {originality && (
          <span className="text-[var(--c-muted)]">
            <Sparkle size={10} className="mr-0.5 inline" />
            {originality}
          </span>
        )}
      </div>
    </div>
  );
}
