import { WarningCircle } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  description: string;
  action?: ReactNode;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-[var(--c-error)] bg-[color-mix(in_oklch,var(--c-error),transparent_90%)] p-4",
        className,
      )}
    >
      <div className="flex gap-3">
        <WarningCircle size={22} className="shrink-0 text-[var(--c-error)]" />
        <div>
          <h2 className="font-display text-base font-medium text-[var(--c-ink)]">{title}</h2>
          <p className="mt-1 text-sm text-[var(--c-body)]">{description}</p>
          {action ??
            (onRetry ? (
              <Button type="button" className="mt-3" size="sm" onClick={onRetry}>
                Retry
              </Button>
            ) : null)}
        </div>
      </div>
    </div>
  );
}
