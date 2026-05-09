import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ThreePanelLayoutProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function ThreePanelLayout({ left, center, right, className }: ThreePanelLayoutProps) {
  return (
    <div
      className={cn(
        "grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)_340px]",
        className,
      )}
    >
      <aside className="min-h-0 overflow-y-auto border-b border-[var(--c-hairline)] p-4 lg:border-b-0 lg:border-r">
        {left}
      </aside>
      <section className="min-h-0 overflow-y-auto border-b border-[var(--c-hairline)] p-4 lg:border-b-0">
        {center}
      </section>
      <aside className="min-h-0 overflow-y-auto p-4 lg:border-l lg:border-[var(--c-hairline)]">
        {right}
      </aside>
    </div>
  );
}
