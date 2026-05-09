import { Fire, Swords } from "@phosphor-icons/react";
import { FightBubble } from "@/components/fight/fight-bubble";
import { FightDebrief } from "@/components/fight/fight-debrief";
import { Button } from "@/components/ui/button";
import { MOCK_DEBRIEF, MOCK_FIGHT_ME_TURNS } from "@/lib/mock-data";

interface FightThreadProps {
  turns?: typeof MOCK_FIGHT_ME_TURNS;
  debrief?: typeof MOCK_DEBRIEF | null;
  roundLabel?: string;
}

export function FightThread({
  turns = MOCK_FIGHT_ME_TURNS,
  debrief = null,
  roundLabel = "Round 2/3",
}: FightThreadProps) {
  if (debrief) {
    return (
      <div>
        <div className="mb-3 border-b border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3 text-center">
          <p className="font-display text-base font-medium text-[var(--c-ink)]">
            <Swords size={16} className="mr-1 inline" /> Fight Complete!
          </p>
        </div>
        <div className="px-1">
          <FightDebrief
            defended={debrief.defended}
            weaker={debrief.weaker}
            stronger={debrief.stronger}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between bg-[var(--c-sig-coral)] px-4 py-2.5 text-[var(--c-on-sig-dark)]">
        <span className="font-display text-sm font-semibold">
          <Swords size={14} className="mr-1 inline" /> FIGHT ME — vs AI
        </span>
        <span className="text-[11px]" style={{ opacity: 0.8 }}>
          {roundLabel}
        </span>
      </div>

      <div className="space-y-2.5 p-3">
        {turns.map((turn, i) => (
          <FightBubble key={i} role={turn.role} text={turn.text} />
        ))}

        <div
          className="rounded-md border bg-[var(--c-surface-soft)] p-3"
          style={{ borderColor: "var(--c-sig-coral)" }}
        >
          <textarea
            placeholder="Your rebuttal..."
            className="w-full resize-none border-none bg-transparent text-sm text-[var(--c-body)] placeholder:text-[var(--c-muted)] focus:outline-none"
            style={{ minHeight: 48, fontFamily: "var(--font-body)" }}
          />
          <div className="mt-2 text-right">
            <Button variant="coral" size="sm" icon={<Fire size={12} weight="fill" />}>
              Fire Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
