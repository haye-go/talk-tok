import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ToneSelector } from "@/components/submission/tone-selector";
import { cn } from "@/lib/utils";

interface ResponseComposerProps {
  wordLimit?: number;
  defaultTone?: string;
  onSubmit?: (text: string, tone: string) => void;
  className?: string;
}

export function ResponseComposer({
  wordLimit = 200,
  defaultTone = "spicy",
  onSubmit,
  className,
}: ResponseComposerProps) {
  const [text, setText] = useState("");
  const [tone, setTone] = useState(defaultTone);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const atLimit = wordCount >= wordLimit;
  const nearLimit = wordCount >= wordLimit * 0.8;

  return (
    <div
      className={cn(
        "rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3",
        className,
      )}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share your perspective..."
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
          {wordCount}/{wordLimit} words
        </span>
        <ToneSelector value={tone} onChange={setTone} />
      </div>
      <Button
        className="mt-2 w-full"
        onClick={() => onSubmit?.(text, tone)}
        disabled={wordCount === 0}
      >
        Submit
      </Button>
    </div>
  );
}
