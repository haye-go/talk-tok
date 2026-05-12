import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  tone?: "neutral" | "cream" | "alert";
}

const toneClass: Record<NonNullable<CardProps["tone"]>, string> = {
  neutral: "border-[var(--c-hairline)] bg-[var(--c-surface-soft)]",
  cream: "border-[var(--c-sig-mustard)]/30 bg-[var(--c-sig-cream)]",
  alert: "border-[var(--c-error)]/40 bg-[color-mix(in_oklch,var(--c-error),transparent_92%)]",
};

export function Card({
  className,
  title,
  eyebrow,
  action,
  tone = "neutral",
  children,
  ...props
}: CardProps) {
  return (
    <section
      className={cn(
        "rounded-md border p-4 text-[var(--c-body)]",
        toneClass[tone],
        className,
      )}
      {...props}
    >
      {title || eyebrow || action ? (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {eyebrow ? (
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--c-muted)]">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="font-display text-base font-medium text-[var(--c-ink)]">{title}</h2>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
