import { describe, expect, it } from "vitest";
import { makeReadableSlug, normalizeSessionCode, normalizeSessionSlug } from "./session-slug";

describe("session slug helpers", () => {
  it("creates readable URL slugs", () => {
    expect(makeReadableSlug(" Ethics of AI in Healthcare! ")).toBe("ethics-of-ai-in-healthcare");
  });

  it("normalizes existing slug-like input", () => {
    expect(normalizeSessionSlug("AI---Safety / Debate")).toBe("ai-safety-debate");
  });

  it("normalizes short join codes", () => {
    expect(normalizeSessionCode(" sp-ark!! ")).toBe("SPARK");
  });
});
