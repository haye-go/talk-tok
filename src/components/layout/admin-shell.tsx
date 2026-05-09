import type { ReactNode } from "react";
import { InstructorBrandBar } from "@/components/layout/instructor-brand-bar";
import { INSTRUCTOR_NAV } from "@/lib/constants";

export interface AdminShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AdminShell({ title, description, children }: AdminShellProps) {
  return (
    <div className="min-h-dvh bg-[var(--c-canvas)]">
      <InstructorBrandBar />
      <header className="flex min-h-16 items-center border-b border-[var(--c-hairline)] px-6">
        <div>
          <h1 className="font-display text-xl font-medium text-[var(--c-ink)]">{title}</h1>
          <p className="text-sm text-[var(--c-muted)]">{description}</p>
        </div>
      </header>
      <div className="grid gap-6 p-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav
          className="flex gap-2 overflow-x-auto lg:block lg:space-y-2"
          aria-label="Admin navigation"
        >
          {INSTRUCTOR_NAV.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className="flex min-h-10 shrink-0 items-center gap-2 rounded-sm px-3 text-sm text-[var(--c-muted)] hover:bg-[var(--c-surface-soft)] hover:text-[var(--c-ink)]"
            >
              <item.icon size={16} />
              {item.label}
            </a>
          ))}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
