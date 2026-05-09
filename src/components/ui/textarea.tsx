import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Textarea({ className, id, label, hint, error, ...props }: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-xs font-medium text-[var(--c-muted)]">{label}</span>
      ) : null}
      <textarea
        id={textareaId}
        className={cn(
          "min-h-28 w-full resize-y rounded-sm border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] px-3 py-2 text-sm leading-6 text-[var(--c-ink)] outline-none transition focus:border-[var(--c-info-border)] disabled:cursor-not-allowed disabled:opacity-50",
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
