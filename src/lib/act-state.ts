import { ACTS, type ActId, type TabId } from "@/lib/constants";

export function getActIndex(actId: ActId) {
  return Math.max(
    0,
    ACTS.findIndex((act) => act.id === actId),
  );
}

export function getNextActId(actId: ActId): ActId {
  const actIndex = getActIndex(actId);
  return ACTS[Math.min(actIndex + 1, ACTS.length - 1)].id;
}

export function getPreviousActId(actId: ActId): ActId {
  const actIndex = getActIndex(actId);
  return ACTS[Math.max(actIndex - 1, 0)].id;
}

export function isTabUnlockedForAct(actId: ActId, tabId: TabId) {
  if (tabId === "main" || tabId === "my-zone") {
    return true;
  }

  if (tabId === "stream") {
    return actId !== "submit";
  }

  return actId === "challenge" || actId === "synthesize";
}
