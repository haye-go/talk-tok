import { Robot } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface FightBubbleProps {
  role: "attacker" | "defender" | "ai";
  body: string;
  turnNumber: number;
  status?: "submitted" | "missed";
  source?: "manual" | "draft_timeout" | "ai";
  nickname?: string;
  isMe?: boolean;
}

export function FightBubble({
  role,
  body,
  turnNumber,
  status = "submitted",
  source = "manual",
  nickname,
  isMe,
}: FightBubbleProps) {
  const isAi = role === "ai";
  const missed = status === "missed";
  const autoSubmitted = source === "draft_timeout";

  return (
    <div
      className={cn(
        "rounded-md p-3 text-xs leading-relaxed",
        missed && "opacity-50",
        isAi
          ? "rounded-bl-sm border-l-[3px] border-l-[var(--c-sig-coral)] bg-[var(--c-surface-soft)]"
          : isMe
            ? "ml-6 rounded-br-sm border-r-[3px] border-r-[var(--c-success)] bg-[var(--c-surface-soft)]"
            : "ml-6 rounded-br-sm border-r-[3px] border-r-[var(--c-sig-sky)] bg-[var(--c-surface-soft)]",
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="font-display text-[11px] font-semibold">
          {isAi ? (
            <span className="text-[var(--c-sig-coral)]">
              <Robot size={12} className="mr-0.5 inline" /> AI
            </span>
          ) : (
            <span className={isMe ? "text-[var(--c-success)]" : "text-[var(--c-sig-sky)]"}>
              {isMe ? "You" : (nickname ?? role)}
            </span>
          )}
        </span>
        <span className="text-[10px] text-[var(--c-muted)]">
          Turn {turnNumber}
          {autoSubmitted && " · auto-submitted"}
        </span>
      </div>
      {missed ? (
        <p className="italic text-[var(--c-muted)]">Turn missed — no response submitted in time.</p>
      ) : (
        <p className="text-[var(--c-body)]">{body}</p>
      )}
    </div>
  );
}
