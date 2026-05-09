import { cn } from "@/lib/utils";

interface PresenceBarProps {
  typing?: number;
  submitted?: number;
  idle?: number;
  className?: string;
}

export function PresenceBar({ typing = 0, submitted = 0, idle = 0, className }: PresenceBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] px-3 py-2",
        className,
      )}
    >
      <span className="text-[11px] text-[var(--c-success)]">
        <span className="mr-0.5 inline-block h-2 w-2 rounded-full bg-[var(--c-success)]" />
        {typing} typing
      </span>
      <span className="text-[11px] text-[var(--c-sig-sky)]">
        <span className="mr-0.5 inline-block h-2 w-2 rounded-full bg-[var(--c-sig-sky)]" />
        {submitted} submitted
      </span>
      <span className="text-[11px] text-[var(--c-muted)]">
        <span className="mr-0.5 inline-block h-2 w-2 rounded-full bg-[var(--c-muted)]" />
        {idle} idle
      </span>
    </div>
  );
}
