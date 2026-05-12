import { useState, type FormEvent } from "react";
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
  placeholder = "Share your perspective...",
  disabled = false,
  onSubmit,
  className,
}: ResponseComposerProps) {
  const telemetry = useInputTelemetry();
  const [text, setText] = useState("");
  const [tone, setTone] = useState(defaultTone);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      className={cn(
        "rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3",
        className,
      )}
    >
      <textarea
        value={text}
        onKeyDown={telemetry.onKeyDown}
        onPaste={telemetry.onPaste}
        onChange={(event) => {
          setText(event.target.value);
          telemetry.onChange(event.target.value);
        }}
        placeholder={placeholder}
        disabled={disabled || isSubmitting}
        className="w-full resize-y border-none bg-transparent text-sm text-[var(--c-body)] placeholder:text-[var(--c-muted)] focus:outline-none"
        style={{ minHeight: 100, fontFamily: "var(--font-body)" }}
      />
      <div className="mt-2 flex items-center justify-between border-t border-[var(--c-hairline)] pt-2">
        <span
          className={cn(
            "text-[10px]",
            atLimit
              ? "text-[var(--c-error)]"
              : nearLimit
                ? "text-[var(--c-sig-mustard)]"
                : "text-[var(--c-muted)]",
          )}
        >
          {wordCount}/{limit} words
        </span>
        <ToneSelector value={tone} onChange={setTone} />
      </div>
      <Button
        className="mt-2 w-full"
        type="submit"
        disabled={disabled || isSubmitting || wordCount === 0}
      >
        {isSubmitting ? "Submitting..." : submitLabel}
      </Button>
    </form>
  );
}
