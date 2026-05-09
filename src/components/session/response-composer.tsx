import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useInputTelemetry } from "@/hooks/use-input-telemetry";
import { countWords, type InputTelemetrySnapshot } from "@/lib/submission-telemetry";

export interface ResponseComposerSubmit {
  body: string;
  telemetry: InputTelemetrySnapshot;
}

export interface ResponseComposerProps {
  softWordLimit: number;
  disabled?: boolean;
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (submission: ResponseComposerSubmit) => Promise<void> | void;
}

export function ResponseComposer({
  softWordLimit,
  disabled = false,
  placeholder = "Share your perspective...",
  submitLabel = "Submit",
  onSubmit,
}: ResponseComposerProps) {
  const telemetry = useInputTelemetry();
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const wordCount = countWords(body);
  const isOverSoftLimit = wordCount > softWordLimit;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!body.trim() || disabled || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        body,
        telemetry: telemetry.snapshot(body),
      });
      setBody("");
      telemetry.reset();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <Textarea
        label="Response"
        placeholder={placeholder}
        value={body}
        onKeyDown={telemetry.onKeyDown}
        onPaste={telemetry.onPaste}
        onChange={(event) => {
          setBody(event.target.value);
          telemetry.onChange(event.target.value);
        }}
        disabled={disabled || isSubmitting}
        hint={`${wordCount}/${softWordLimit} words${isOverSoftLimit ? " - over soft limit" : ""}`}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--c-muted)]">
          Typing telemetry is captured locally and sent only when you submit.
        </p>
        <Button type="submit" disabled={disabled || isSubmitting || !body.trim()}>
          {isSubmitting ? "Submitting..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
