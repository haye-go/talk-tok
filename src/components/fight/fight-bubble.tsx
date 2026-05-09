import { Robot } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface FightBubbleProps {
  role: "ai" | "student";
  text: string;
}

export function FightBubble({ role, text }: FightBubbleProps) {
  const isAi = role === "ai";

  return (
    <div
      className={cn(
        "rounded-md p-3 text-xs leading-relaxed text-[var(--c-body)]",
        isAi
          ? "rounded-bl-sm border-l-[3px] border-l-[var(--c-sig-coral)] bg-[var(--c-surface-soft)]"
          : "ml-6 rounded-br-sm border-r-[3px] border-r-[var(--c-success)] bg-[var(--c-surface-soft)]",
      )}
    >
      <p className="mb-1 font-display text-[11px] font-semibold">
        {isAi ? (
          <span className="text-[var(--c-sig-coral)]">
            <Robot size={12} className="mr-0.5 inline" /> AI Challenger
          </span>
        ) : (
          <span className="text-[var(--c-success)]">You</span>
        )}
      </p>
      <p>&ldquo;{text}&rdquo;</p>
    </div>
  );
}
