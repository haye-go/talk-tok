import { GearSix } from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { DEMO_SESSION_CODE } from "@/lib/constants";
import { routes } from "@/lib/routes";

export interface InstructorTopBarProps {
  sessionTitle?: string;
  sessionCode?: string;
  participantCount?: number;
}

export function InstructorTopBar({
  sessionTitle = "Demo Discussion",
  sessionCode = DEMO_SESSION_CODE,
  participantCount = 0,
}: InstructorTopBarProps) {
  return (
    <header className="flex min-h-14 items-center justify-between gap-4 border-b border-[var(--c-hairline)] bg-[var(--c-canvas)] px-4">
      <a href={routes.instructor()} className="flex items-center gap-2.5 no-underline shrink-0">
        <img src="/favicon.svg" alt="" className="h-8 w-8" />
        <span className="font-display text-lg font-semibold text-[var(--c-ink)]">TalkTok</span>
      </a>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate font-display text-base font-medium text-[var(--c-ink)]">
            {sessionTitle}
          </h1>
          <Badge tone="slate">{sessionCode}</Badge>
        </div>
        <p className="text-xs text-[var(--c-muted)]">{participantCount} participants</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-sm text-[var(--c-muted)] transition-colors hover:bg-[var(--c-surface-soft)] hover:text-[var(--c-ink)]"
          onClick={() => (window.location.href = routes.instructorAdminModels())}
          aria-label="LLM model settings"
        >
          <GearSix size={16} />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
