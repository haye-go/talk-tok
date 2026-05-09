import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MetricTileProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
}

export function MetricTile({ className, label, value, detail, icon, ...props }: MetricTileProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-4",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-[0.14em] text-[var(--c-muted)]">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-3 font-display text-3xl font-medium text-[var(--c-ink)]">{value}</div>
      {detail ? <div className="mt-1 text-xs text-[var(--c-muted)]">{detail}</div> : null}
    </div>
  );
}
