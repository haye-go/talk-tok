import { ArrowCircleUp, ClipboardText } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useInputTelemetry } from "@/hooks/use-input-telemetry";
import { countWords } from "@/lib/submission-telemetry";
import type { ResponseComposerSubmit } from "@/components/submission/response-composer";
import { cn } from "@/lib/utils";

interface InlineFollowUpComposerProps {
  softWordLimit?: number;
  onSubmit: (submission: ResponseComposerSubmit) => Promise<void> | void;
  onCancel: () => void;
}

export function InlineFollowUpComposer({
  softWordLimit,
  onSubmit,
  onCancel,
}: InlineFollowUpComposerProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const telemetry = useInputTelemetry();
  const limit = softWordLimit ?? 200;
  const wordCount = countWords(text);
  const atLimit = wordCount >= limit;
  const nearLimit = wordCount >= limit * 0.8;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit() {
    const body = text.trim();
    if (!body || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit({ body, telemetry: telemetry.snapshot(body) });
      setText("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 rounded-md border border-dashed border-[var(--c-border-strong)] bg-[var(--c-surface-soft)] px-3 py-2">
      <textarea
        ref={inputRef}
        value={text}
        rows={1}
        onKeyDown={(e) => {
          telemetry.onKeyDown(e);
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            void handleSubmit();
          }
          if (e.key === "Escape") onCancel();
        }}
        onPaste={telemetry.onPaste}
        onChange={(e) => {
          setText(e.target.value);
          telemetry.onChange(e.target.value);
          const el = e.target;
          el.style.height = "auto";
          el.style.height = `${el.scrollHeight}px`;
        }}
        onBlur={() => {
          if (!text.trim()) onCancel();
        }}
        placeholder="Add a follow-up..."
        disabled={submitting}
        className="w-full resize-none border-none bg-transparent text-xs leading-relaxed text-[var(--c-body)] placeholder:text-[var(--c-muted)] focus:outline-none"
        style={{ fontFamily: "var(--font-body)" }}
      />
      <div className="mt-1 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px]">
          <span
            className={cn(
              atLimit
                ? "text-[var(--c-error)]"
                : nearLimit
                  ? "text-[var(--c-sig-mustard)]"
                  : "text-[var(--c-muted)]",
            )}
          >
            {wordCount}/{limit} words
          </span>
          <span
            aria-label={`${telemetry.pasteEventCount} paste events`}
            title={`${telemetry.pasteEventCount} paste events`}
            className="inline-flex items-center gap-0.5 text-[var(--c-muted)]"
          >
            <ClipboardText size={11} weight="bold" aria-hidden="true" />
            {telemetry.pasteEventCount}
          </span>
        </div>
        <button
          type="button"
          disabled={!text.trim() || submitting}
          onClick={() => void handleSubmit()}
          className="shrink-0 text-[var(--c-primary)] transition-opacity disabled:opacity-30"
        >
          <ArrowCircleUp size={22} weight="fill" />
        </button>
      </div>
    </div>
  );
}
