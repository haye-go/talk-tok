import { useRef, useState } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { createTelemetrySnapshot, type InputTelemetrySnapshot } from "@/lib/submission-telemetry";

const IGNORED_KEYS = new Set([
  "Alt",
  "CapsLock",
  "Control",
  "Meta",
  "Shift",
  "Tab",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
]);

export interface InputTelemetryHandlers {
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onChange: (value: string) => void;
  snapshot: (body: string) => InputTelemetrySnapshot;
  reset: () => void;
  pasteEventCount: number;
}

export function useInputTelemetry(): InputTelemetryHandlers {
  const typingStartedAt = useRef<number | undefined>(undefined);
  const pasteEventCount = useRef(0);
  const pastedCharacterCount = useRef(0);
  const keystrokeCount = useRef(0);
  const [livePasteEventCount, setLivePasteEventCount] = useState(0);

  function ensureStarted(value?: string) {
    if (!typingStartedAt.current && value?.trim()) {
      typingStartedAt.current = Date.now();
    }
  }

  return {
    onKeyDown(event) {
      ensureStarted(event.currentTarget.value);

      if (!IGNORED_KEYS.has(event.key)) {
        keystrokeCount.current += 1;
      }
    },
    onPaste(event) {
      ensureStarted(event.currentTarget.value);
      pasteEventCount.current += 1;
      setLivePasteEventCount(pasteEventCount.current);
      pastedCharacterCount.current += event.clipboardData.getData("text").length;
    },
    onChange(value) {
      ensureStarted(value);
    },
    snapshot(body) {
      const typingFinishedAt = Date.now();

      return createTelemetrySnapshot({
        body,
        typingStartedAt: typingStartedAt.current,
        typingFinishedAt,
        pasteEventCount: pasteEventCount.current,
        pastedCharacterCount: pastedCharacterCount.current,
        keystrokeCount: keystrokeCount.current,
      });
    },
    reset() {
      typingStartedAt.current = undefined;
      pasteEventCount.current = 0;
      pastedCharacterCount.current = 0;
      keystrokeCount.current = 0;
      setLivePasteEventCount(0);
    },
    pasteEventCount: livePasteEventCount,
  };
}
