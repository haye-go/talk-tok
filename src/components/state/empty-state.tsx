import { ChatCircleText } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "grid place-items-center rounded-md border border-dashed border-[var(--c-hairline)] p-8 text-center",
        className,
      )}
    >
      <div className="grid max-w-sm place-items-center gap-3">
        <ChatCircleText size={32} className="text-[var(--c-muted)]" />
        <div>
          <h2 className="font-display text-base font-medium text-[var(--c-ink)]">{title}</h2>
          {description ? <p className="mt-1 text-sm text-[var(--c-muted)]">{description}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}
