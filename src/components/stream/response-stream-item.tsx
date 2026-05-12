import { Lightning, Sparkle, Timer } from "@phosphor-icons/react";
import { ParticipantThreadCard } from "@/components/messages/participant-thread-card";
import type { BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ResponseStreamItemProps {
  nickname: string;
  text: string;
  categoryColor: NonNullable<BadgeProps["tone"]>;
  categoryName?: string;
  originality?: string;
  telemetryLabel?: string;
  telemetryWarning?: boolean;
  isOwn?: boolean;
  className?: string;
}

export function ResponseStreamItem({
  nickname,
  text,
  categoryColor,
  categoryName,
  originality,
  telemetryLabel,
  telemetryWarning,
  isOwn,
  className,
}: ResponseStreamItemProps) {
  return (
    <ParticipantThreadCard
      authorLabel={nickname}
      body={text}
      categoryName={categoryName}
      categoryTone={categoryColor}
      ownership={isOwn ? "own" : "peer"}
      className={className}
    >
      <div className={cn("flex flex-wrap items-center gap-2 text-[10px]", !telemetryLabel && !originality && "hidden")}>
        {telemetryLabel && (
          <span
            className={telemetryWarning ? "text-[var(--c-sig-coral)]" : "text-[var(--c-muted)]"}
          >
            {telemetryWarning ? (
              <Lightning size={10} className="mr-0.5 inline" />
            ) : (
              <Timer size={10} className="mr-0.5 inline" />
            )}
            {telemetryLabel}
          </span>
        )}
        {originality && (
          <span className="text-[var(--c-muted)]">
            <Sparkle size={10} className="mr-0.5 inline" />
            {originality}
          </span>
        )}
      </div>
    </ParticipantThreadCard>
  );
}
