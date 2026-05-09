import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function Chip({ className, selected, type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      data-selected={selected ? "true" : "false"}
      className={cn(
        "inline-flex min-h-9 items-center rounded-pill border border-[var(--c-hairline)] px-3 text-xs font-medium text-[var(--c-muted)] transition hover:bg-[var(--c-surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-info-border)] data-[selected=true]:border-[var(--c-primary)] data-[selected=true]:bg-[var(--c-primary)] data-[selected=true]:text-[var(--c-on-primary)]",
        className,
      )}
      {...props}
    />
  );
}
