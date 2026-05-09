import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "sky" | "peach" | "coral" | "slate" | "success" | "warning" | "error";
}

const toneClass: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "border-[var(--c-hairline)] bg-[var(--c-surface-strong)] text-[var(--c-ink)]",
  sky: "border-transparent bg-[var(--c-sig-sky)] text-[var(--c-ink)]",
  peach: "border-transparent bg-[var(--c-sig-peach)] text-[var(--c-ink)]",
  coral: "border-transparent bg-[var(--c-sig-coral)] text-white",
  slate: "border-transparent bg-[var(--c-sig-slate)] text-white",
  success: "border-transparent bg-[var(--c-success)] text-white",
  warning: "border-transparent bg-[var(--c-warning)] text-[var(--c-ink)]",
  error: "border-transparent bg-[var(--c-error)] text-white",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-pill border px-2.5 text-xs font-medium",
        toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}
