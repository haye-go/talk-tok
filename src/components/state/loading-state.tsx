import { CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = "Loading...", className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-32 items-center justify-center gap-2 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] text-sm text-[var(--c-muted)]",
        className,
      )}
    >
      <CircleNotch size={18} className="animate-spin" />
      {label}
    </div>
  );
}
