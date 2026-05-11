import { describe, expect, it } from "vitest";
import { getActIndex, getNextActId, getPreviousActId, isTabUnlockedForAct } from "@/lib/act-state";

describe("act state helpers", () => {
  it("returns act positions", () => {
    expect(getActIndex("submit")).toBe(0);
    expect(getActIndex("synthesize")).toBe(3);
  });

  it("does not advance beyond synthesize", () => {
    expect(getNextActId("submit")).toBe("discover");
    expect(getNextActId("synthesize")).toBe("synthesize");
  });

  it("does not go back before submit", () => {
    expect(getPreviousActId("submit")).toBe("submit");
    expect(getPreviousActId("challenge")).toBe("discover");
  });

  it("keeps learner tabs accessible across acts", () => {
    expect(isTabUnlockedForAct("submit", "contribute")).toBe(true);
    expect(isTabUnlockedForAct("submit", "explore")).toBe(true);
    expect(isTabUnlockedForAct("discover", "fight")).toBe(true);
    expect(isTabUnlockedForAct("challenge", "me")).toBe(true);
  });
});
