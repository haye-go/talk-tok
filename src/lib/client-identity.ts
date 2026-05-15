export const CLIENT_KEY_STORAGE_KEY = "talktok-client-key";
const ORIGINAL_KEY_STORAGE_KEY = "talktok-original-client-key";

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

export function getOrCreateParticipantClientKey() {
  const storage = getStorage();

  if (!storage) {
    return createClientKey();
  }

  const existing = storage.getItem(CLIENT_KEY_STORAGE_KEY);

  if (!existing?.startsWith("demo-")) {
    return getOrCreateClientKey();
  }

  if (restoreOriginalClientKey()) {
    return getOrCreateClientKey();
  }

  storage.removeItem(CLIENT_KEY_STORAGE_KEY);
  return getOrCreateClientKey();
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

export function isDemoClientKey(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  const key = storage.getItem(CLIENT_KEY_STORAGE_KEY);
  return key != null && key.startsWith("demo-");
}

export function getDemoNickname(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  const key = storage.getItem(CLIENT_KEY_STORAGE_KEY);
  if (!key || !key.startsWith("demo-")) return null;
  const raw = key.slice("demo-".length);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function setDemoClientKey(demoKey: string) {
  const storage = getStorage();
  if (!storage) return;
  const current = storage.getItem(CLIENT_KEY_STORAGE_KEY);
  if (current && !current.startsWith("demo-")) {
    storage.setItem(ORIGINAL_KEY_STORAGE_KEY, current);
  }
  storage.setItem(CLIENT_KEY_STORAGE_KEY, demoKey);
}

export function restoreOriginalClientKey(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  const original = storage.getItem(ORIGINAL_KEY_STORAGE_KEY);
  if (!original) return false;
  storage.setItem(CLIENT_KEY_STORAGE_KEY, original);
  storage.removeItem(ORIGINAL_KEY_STORAGE_KEY);
  return true;
}
