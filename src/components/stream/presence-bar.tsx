import { User } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface PresenceBarProps {
  typing?: number;
  className?: string;
}

export function PresenceBar({ typing = 0, className }: PresenceBarProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-pill bg-[var(--c-surface-strong)] px-2 py-1 text-[10px] text-[var(--c-success)]",
        className,
      )}
    >
      <User size={10} weight="bold" />
      <span className="font-display">{typing}</span>
    </span>
  );
}
