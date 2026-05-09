export const CLIENT_KEY_STORAGE_KEY = "talktok-client-key";

export interface StoredParticipant {
  sessionSlug: string;
  participantSlug: string;
  nickname: string;
  savedAt: number;
}

export function participantStorageKey(sessionSlug: string) {
  return `talktok-participant:${sessionSlug}`;
}

function createClientKey() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function getOrCreateClientKey() {
  const storage = getStorage();

  if (!storage) {
    return createClientKey();
  }

  const existing = storage.getItem(CLIENT_KEY_STORAGE_KEY);

  if (existing) {
    return existing;
  }

  const clientKey = createClientKey();
  storage.setItem(CLIENT_KEY_STORAGE_KEY, clientKey);

  return clientKey;
}

export function readStoredParticipant(sessionSlug: string) {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const raw = storage.getItem(participantStorageKey(sessionSlug));

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredParticipant;
  } catch {
    storage.removeItem(participantStorageKey(sessionSlug));
    return null;
  }
}

export function storeParticipant(value: Omit<StoredParticipant, "savedAt">) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(
    participantStorageKey(value.sessionSlug),
    JSON.stringify({
      ...value,
      savedAt: Date.now(),
    }),
  );
}
