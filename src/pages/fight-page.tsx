import { useState } from "react";
import { ParticipantShell } from "@/components/layout/participant-shell";
import { FightThread } from "@/components/fight/fight-thread";
import { MOCK_DEBRIEF, MOCK_FIGHT_ME_TURNS } from "@/lib/mock-data";

export function FightPage() {
  const [showDebrief, setShowDebrief] = useState(false);

  return (
    <ParticipantShell
      fightMe={
        <div>
          <FightThread
            turns={MOCK_FIGHT_ME_TURNS}
            debrief={showDebrief ? MOCK_DEBRIEF : null}
            roundLabel="Round 2/3"
          />
          {!showDebrief && (
            <button
              type="button"
              onClick={() => setShowDebrief(true)}
              className="mt-3 w-full text-center text-xs text-[var(--c-link)] underline"
            >
              (demo: show debrief)
            </button>
          )}
        </div>
      }
    />
  );
}
