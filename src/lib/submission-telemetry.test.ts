import { describe, expect, it } from "vitest";
import {
  countWords,
  createTelemetrySnapshot,
  deriveInputPattern,
  inputPatternLabel,
  normalizeForDuplicateCheck,
} from "./submission-telemetry";

describe("submission telemetry helpers", () => {
  it("counts words across normal punctuation", () => {
    expect(countWords("AI shouldn't replace doctors, but it can assist.")).toBe(8);
  });

  it("normalizes duplicate checks without preserving spacing or case", () => {
    expect(normalizeForDuplicateCheck("  Same   Point\nAgain ")).toBe("same point again");
  });

  it("detects likely pasted composition without storing pasted content", () => {
    expect(
      deriveInputPattern({
        body: "A long paragraph that appears very quickly and has a paste event attached.",
        compositionMs: 2_500,
        pasteEventCount: 1,
        pastedCharacterCount: 140,
        keystrokeCount: 2,
      }),
    ).toBe("likely_pasted");
  });

  it("detects mixed composition when paste is followed by typing", () => {
    expect(
      deriveInputPattern({
        body: "Pasted starting point, then the student added more of their own reasoning.",
        compositionMs: 45_000,
        pasteEventCount: 1,
        pastedCharacterCount: 40,
        keystrokeCount: 55,
      }),
    ).toBe("mixed");
  });

  it("detects gradual composition from slow local counters", () => {
    expect(
      deriveInputPattern({
        body: "I think the liability problem is not just legal but also institutional.",
        compositionMs: 65_000,
        pasteEventCount: 0,
        keystrokeCount: 70,
      }),
    ).toBe("composed_gradually");
  });

  it("creates a telemetry snapshot with derived composition duration", () => {
    expect(
      createTelemetrySnapshot({
        body: "Short but typed.",
        typingStartedAt: 100,
        typingFinishedAt: 1_100,
        pasteEventCount: 0,
        pastedCharacterCount: 0,
        keystrokeCount: 8,
      }).compositionMs,
    ).toBe(1_000);
  });

  it("labels input patterns for display", () => {
    expect(inputPatternLabel("likely_pasted")).toBe("Likely pasted");
  });
});
