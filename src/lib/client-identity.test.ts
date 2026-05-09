import { describe, expect, it } from "vitest";
import { CLIENT_KEY_STORAGE_KEY, participantStorageKey } from "./client-identity";

describe("client identity helpers", () => {
  it("uses a stable app-level client key namespace", () => {
    expect(CLIENT_KEY_STORAGE_KEY).toBe("talktok-client-key");
  });

  it("stores participant restore data per readable session slug", () => {
    expect(participantStorageKey("ethics-ai-healthcare")).toBe(
      "talktok-participant:ethics-ai-healthcare",
    );
  });
});
