import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?:
    | "neutral"
    | "sky"
    | "peach"
    | "coral"
    | "slate"
    | "cream"
    | "mustard"
    | "yellow"
    | "success"
    | "warning"
    | "error";
}

const toneClass: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "border-[var(--c-hairline)] bg-[var(--c-surface-strong)] text-[var(--c-ink)]",
  sky: "border-transparent bg-[var(--c-sig-sky)] text-[var(--c-on-sig-light)]",
  peach: "border-transparent bg-[var(--c-sig-peach)] text-[var(--c-on-sig-light)]",
  coral: "border-transparent bg-[var(--c-sig-coral)] text-[var(--c-on-sig-dark)]",
  slate: "border-transparent bg-[var(--c-sig-slate)] text-[var(--c-on-sig-dark)]",
  cream: "border-transparent bg-[var(--c-sig-cream)] text-[var(--c-on-sig-light)]",
  mustard: "border-transparent bg-[var(--c-sig-mustard)] text-[var(--c-on-sig-light)]",
  yellow: "border-transparent bg-[var(--c-sig-yellow)] text-[var(--c-on-sig-light)]",
  success: "border-transparent bg-[var(--c-success)] text-white",
  warning: "border-transparent bg-[var(--c-warning)] text-[var(--c-on-sig-light)]",
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
