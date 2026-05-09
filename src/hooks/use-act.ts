import { useEffect, useState } from "react";
import { getActIndex, getNextActId, getPreviousActId, isTabUnlockedForAct } from "@/lib/act-state";
import { ACTS, type ActId, type TabId } from "@/lib/constants";

export function useAct(initialAct: ActId = "submit") {
  const [actId, setActId] = useState<ActId>(initialAct);
  const actIndex = getActIndex(actId);

  useEffect(() => {
    setActId(initialAct);
  }, [initialAct]);

  function setAct(nextActId: ActId) {
    setActId(nextActId);
  }

  function advanceAct() {
    setActId(getNextActId(actId));
  }

  function goBackAct() {
    setActId(getPreviousActId(actId));
  }

  function isTabUnlocked(tabId: TabId) {
    return isTabUnlockedForAct(actId, tabId);
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
