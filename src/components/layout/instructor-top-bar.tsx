import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ACTS, DEMO_SESSION_CODE } from "@/lib/constants";

export interface InstructorTopBarProps {
  sessionTitle?: string;
  sessionCode?: string;
  participantCount?: number;
  actIndex?: number;
  onPreviousAct?: () => void;
  onNextAct?: () => void;
}

export function InstructorTopBar({
  sessionTitle = "Demo Discussion",
  sessionCode = DEMO_SESSION_CODE,
  participantCount = 0,
  actIndex = 0,
  onPreviousAct,
  onNextAct,
}: InstructorTopBarProps) {
  const safeIndex = Math.min(Math.max(actIndex, 0), ACTS.length - 1);
  const act = ACTS[safeIndex];

  return (
    <header className="flex min-h-14 items-center justify-between gap-4 border-b border-[var(--c-hairline)] bg-[var(--c-canvas)] px-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate font-display text-base font-medium text-[var(--c-ink)]">
            {sessionTitle}
          </h1>
          <Badge tone="slate">{sessionCode}</Badge>
        </div>
        <p className="text-xs text-[var(--c-muted)]">
          {participantCount} participants · Act {safeIndex + 1}: {act.label}
        </p>
      </div>
      <div className="hidden items-center gap-1 md:flex">
        {ACTS.map((item, index) => (
          <span
            key={item.id}
            className="h-1 w-8 rounded-pill bg-[var(--c-hairline)]"
            style={index <= safeIndex ? { backgroundColor: act.color } : undefined}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onPreviousAct}
          icon={<ArrowLeft size={14} />}
        >
          Prev
        </Button>
        <Button type="button" size="sm" onClick={onNextAct} icon={<ArrowRight size={14} />}>
          Next
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
