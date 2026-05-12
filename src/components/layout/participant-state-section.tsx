import type { ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";

type StateKind = "empty" | "locked" | "waiting" | "hidden";

interface ParticipantStateSectionProps {
  kind: StateKind;
  icon?: Icon;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function ParticipantStateSection({
  icon: IconComponent,
  title,
  children,
  action,
}: ParticipantStateSectionProps) {
  return (
    <Card>
      {IconComponent ? (
        <div className="mb-2">
          <IconComponent size={20} className="text-[var(--c-muted)]" />
        </div>
      ) : null}
      {title ? (
        <p className="mb-1 font-display text-sm font-medium text-[var(--c-ink)]">{title}</p>
      ) : null}
      <div className="text-sm text-[var(--c-muted)]">{children}</div>
      {action ? (
        <div className="mt-3">{action}</div>
      ) : null}
    </Card>
  );
}
