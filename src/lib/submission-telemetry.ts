export type InputPattern = "composed_gradually" | "likely_pasted" | "mixed" | "unknown";

export interface InputTelemetrySnapshot {
  typingStartedAt?: number;
  typingFinishedAt?: number;
  compositionMs?: number;
  pasteEventCount: number;
  pastedCharacterCount: number;
  keystrokeCount: number;
  inputPattern: InputPattern;
}

export interface InputPatternInput {
  body: string;
  compositionMs?: number;
  pasteEventCount: number;
  pastedCharacterCount?: number;
  keystrokeCount: number;
}

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const FAST_COMPOSITION_MS = 8_000;
const GRADUAL_COMPOSITION_MS = 25_000;
const LARGE_PASTE_CHARACTER_COUNT = 120;

export function countWords(value: string) {
  return value.trim().match(WORD_PATTERN)?.length ?? 0;
}

export function normalizeSubmissionBody(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeForDuplicateCheck(value: string) {
  return normalizeSubmissionBody(value).toLowerCase();
}

export function deriveInputPattern({
  body,
  compositionMs,
  pasteEventCount,
  pastedCharacterCount = 0,
  keystrokeCount,
}: InputPatternInput): InputPattern {
  const normalizedBody = normalizeSubmissionBody(body);

  if (!normalizedBody) {
    return "unknown";
  }

  const hasPaste = pasteEventCount > 0 || pastedCharacterCount > 0;
  const largePaste = pastedCharacterCount >= LARGE_PASTE_CHARACTER_COUNT;
  const veryFast = typeof compositionMs === "number" && compositionMs <= FAST_COMPOSITION_MS;
  const gradual =
    typeof compositionMs === "number" &&
    compositionMs >= GRADUAL_COMPOSITION_MS &&
    keystrokeCount >= Math.min(20, Math.ceil(normalizedBody.length / 8));

  if (hasPaste && (largePaste || veryFast || keystrokeCount < normalizedBody.length / 8)) {
    return "likely_pasted";
  }

  if (hasPaste) {
    return "mixed";
  }

  if (gradual) {
    return "composed_gradually";
  }

  return "unknown";
}

export function createTelemetrySnapshot(
  input: Omit<InputPatternInput, "inputPattern"> & {
    typingStartedAt?: number;
    typingFinishedAt?: number;
  },
): InputTelemetrySnapshot {
  const compositionMs =
    typeof input.compositionMs === "number"
      ? input.compositionMs
      : input.typingStartedAt && input.typingFinishedAt
        ? Math.max(0, input.typingFinishedAt - input.typingStartedAt)
        : undefined;

  return {
    typingStartedAt: input.typingStartedAt,
    typingFinishedAt: input.typingFinishedAt,
    compositionMs,
    pasteEventCount: input.pasteEventCount,
    pastedCharacterCount: input.pastedCharacterCount ?? 0,
    keystrokeCount: input.keystrokeCount,
    inputPattern: deriveInputPattern({
      body: input.body,
      compositionMs,
      pasteEventCount: input.pasteEventCount,
      pastedCharacterCount: input.pastedCharacterCount,
      keystrokeCount: input.keystrokeCount,
    }),
  };
}

export function inputPatternLabel(inputPattern: InputPattern) {
  const labels: Record<InputPattern, string> = {
    composed_gradually: "Composed gradually",
    likely_pasted: "Likely pasted",
    mixed: "Mixed composition",
    unknown: "Unknown",
  };

  return labels[inputPattern];
}
