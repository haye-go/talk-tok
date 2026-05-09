import type { HTMLAttributes, ReactNode } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface InlineAlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "info" | "warning" | "error" | "success";
  icon?: ReactNode;
}

const toneClass: Record<NonNullable<InlineAlertProps["tone"]>, string> = {
  info: "border-[var(--c-info-border)] bg-[color-mix(in_oklch,var(--c-info),transparent_90%)]",
  warning: "border-[var(--c-warning)] bg-[color-mix(in_oklch,var(--c-warning),transparent_86%)]",
  error: "border-[var(--c-error)] bg-[color-mix(in_oklch,var(--c-error),transparent_88%)]",
  success: "border-[var(--c-success)] bg-[color-mix(in_oklch,var(--c-success),transparent_88%)]",
};

export function InlineAlert({
  className,
  tone = "info",
  icon,
  children,
  ...props
}: InlineAlertProps) {
  return (
    <div
      className={cn(
        "flex gap-2 rounded-sm border p-3 text-sm text-[var(--c-ink)]",
        toneClass[tone],
        className,
      )}
      {...props}
    >
      <span className="mt-0.5 inline-flex shrink-0">{icon ?? <WarningCircle size={18} />}</span>
      <div>{children}</div>
    </div>
  );
}
