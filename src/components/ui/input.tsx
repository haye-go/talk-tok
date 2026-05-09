import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ className, id, label, hint, error, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-xs font-medium text-[var(--c-muted)]">{label}</span>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "min-h-11 w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] px-3 text-sm text-[var(--c-ink)] outline-none transition focus:border-[var(--c-info-border)] disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-[var(--c-error)]",
          className,
        )}
        {...props}
      />
      {error || hint ? (
        <span
          className={cn(
            "mt-1.5 block text-xs",
            error ? "text-[var(--c-error)]" : "text-[var(--c-muted)]",
          )}
        >
          {error ?? hint}
        </span>
      ) : null}
    </label>
  );
}
