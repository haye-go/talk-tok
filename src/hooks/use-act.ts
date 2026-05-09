import { useState } from "react";
import { ACTS, type ActId, type TabId } from "@/lib/constants";

export function useAct(initialAct: ActId = "submit") {
  const [actId, setActId] = useState<ActId>(initialAct);
  const actIndex = Math.max(
    0,
    ACTS.findIndex((act) => act.id === actId),
  );

  function setAct(nextActId: ActId) {
    setActId(nextActId);
  }

  function advanceAct() {
    const next = ACTS[Math.min(actIndex + 1, ACTS.length - 1)];
    setActId(next.id);
  }

  function goBackAct() {
    const previous = ACTS[Math.max(actIndex - 1, 0)];
    setActId(previous.id);
  }

  function isTabUnlocked(tabId: TabId) {
    if (tabId === "main" || tabId === "my-zone") {
      return true;
    }

    if (tabId === "stream") {
      return actId !== "submit";
    }

    return actId === "challenge" || actId === "synthesize";
  }

  return {
    actId,
    currentAct: ACTS[actIndex],
    actIndex,
    setAct,
    advanceAct,
    goBackAct,
    isTabUnlocked,
  } as const;
}
