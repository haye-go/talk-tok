import { describe, expect, it } from "vitest";
import { sourcePostJsonForDebrief, sourceSubmissionIdForDebrief } from "./fight-debrief-context";

describe("fight debrief context helpers", () => {
  it("uses the defended post for real 1v1 fights", () => {
    expect(
      sourceSubmissionIdForDebrief({
        mode: "real_1v1",
        attackerSubmissionId: "challenger-post",
        defenderSubmissionId: "challenged-post",
      }),
    ).toBe("challenged-post");
  });

  it("uses the participant source post for vs AI fights", () => {
    expect(
      sourceSubmissionIdForDebrief({
        mode: "vs_ai",
        attackerSubmissionId: "participant-post",
      }),
    ).toBe("participant-post");
  });

  it("serializes only the challenged source post fields", () => {
    expect(
      JSON.parse(
        sourcePostJsonForDebrief({
          body: "Original claim being challenged.",
          kind: "initial",
        }),
      ),
    ).toEqual({
      role: "defended_position",
      body: "Original claim being challenged.",
      kind: "initial",
    });
  });
});
