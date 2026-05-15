import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CLIENT_KEY_STORAGE_KEY,
  getOrCreateParticipantClientKey,
  participantStorageKey,
  setDemoClientKey,
} from "./client-identity";

function createLocalStorage() {
  const values = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };
}

describe("client identity helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses a stable app-level client key namespace", () => {
    expect(CLIENT_KEY_STORAGE_KEY).toBe("talktok-client-key");
  });

  it("stores participant restore data per readable session slug", () => {
    expect(participantStorageKey("ethics-ai-healthcare")).toBe(
      "talktok-participant:ethics-ai-healthcare",
    );
  });

  it("restores the original participant key before joining a real session after demo mode", () => {
    const localStorage = createLocalStorage();
    vi.stubGlobal("window", { localStorage });

    localStorage.setItem(CLIENT_KEY_STORAGE_KEY, "real-browser-key");
    setDemoClientKey("demo-maya");

    expect(getOrCreateParticipantClientKey()).toBe("real-browser-key");
    expect(localStorage.getItem(CLIENT_KEY_STORAGE_KEY)).toBe("real-browser-key");
  });

  it("replaces a stranded demo key with a real participant key", () => {
    const localStorage = createLocalStorage();
    vi.stubGlobal("window", { localStorage });

    localStorage.setItem(CLIENT_KEY_STORAGE_KEY, "demo-maya");

    const clientKey = getOrCreateParticipantClientKey();

    expect(clientKey).not.toBe("demo-maya");
    expect(clientKey.startsWith("demo-")).toBe(false);
    expect(localStorage.getItem(CLIENT_KEY_STORAGE_KEY)).toBe(clientKey);
  });
});
