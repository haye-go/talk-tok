import { ClipboardText, PencilSimple } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ToneSelector } from "@/components/submission/tone-selector";
import { useInputTelemetry } from "@/hooks/use-input-telemetry";
import { countWords, type InputTelemetrySnapshot } from "@/lib/submission-telemetry";
import { cn } from "@/lib/utils";

export interface ResponseComposerSubmit {
  body: string;
  tone: string;
  telemetry: InputTelemetrySnapshot;
}

interface ResponseComposerProps {
  wordLimit?: number;
  softWordLimit?: number;
  defaultTone?: string;
  submitLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  onSubmit?: (
    text: string,
    tone: string,
    submission: ResponseComposerSubmit,
  ) => Promise<void> | void;
  className?: string;
}

export function ResponseComposer({
  wordLimit,
  softWordLimit,
  defaultTone = "spicy",
  submitLabel = "Submit",
  placeholder = "Post your questions / thoughts...",
  disabled = false,
  onSubmit,
  className,
}: ResponseComposerProps) {
  const telemetry = useInputTelemetry();
  const [text, setText] = useState("");
  const [tone, setTone] = useState(defaultTone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const expanded = focused || text.length > 0;

  useEffect(() => {
    if (expanded) textareaRef.current?.focus();
  }, [expanded]);
  const limit = softWordLimit ?? wordLimit ?? 200;
  const wordCount = countWords(text);
  const atLimit = wordCount >= limit;
  const nearLimit = wordCount >= limit * 0.8;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!text.trim() || disabled || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submission = {
        body: text,
        tone,
        telemetry: telemetry.snapshot(text),
      };
      await onSubmit?.(text, tone, submission);
      setText("");
      telemetry.reset();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setFocused(false);
        }
      }}
      className={cn(
        "rounded-md border bg-[var(--c-surface-soft)] transition-all",
        expanded
          ? "border-[var(--c-border-strong)] p-3"
          : "border-dashed border-[var(--c-border-strong)] px-3 py-2",
        className,
      )}
    >
      {expanded ? (
        <textarea
          ref={textareaRef}
          value={text}
          onKeyDown={telemetry.onKeyDown}
          onPaste={telemetry.onPaste}
          onFocus={() => setFocused(true)}
          onChange={(event) => {
            setText(event.target.value);
            telemetry.onChange(event.target.value);
          }}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          className="w-full resize-y border-none bg-transparent text-sm text-[var(--c-body)] placeholder:text-[var(--c-muted)] focus:outline-none"
          style={{ minHeight: 100, fontFamily: "var(--font-body)" }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setFocused(true)}
          disabled={disabled}
          className="flex w-full items-center gap-2 text-left"
        >
          <PencilSimple size={14} className="shrink-0 text-[var(--c-muted)]" />
          <span
            className="text-sm text-[var(--c-muted)]"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {placeholder}
          </span>
        </button>
      )}
      {expanded ? (
        <>
          <div className="mt-2 flex items-center justify-between pt-2">
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
            <ToneSelector value={tone} onChange={setTone} />
          </div>
          <Button
            className="mt-2 w-full"
            type="submit"
            disabled={disabled || isSubmitting || wordCount === 0}
          >
            {isSubmitting ? "Submitting..." : submitLabel}
          </Button>
        </>
      ) : null}
    </form>
  );
}
