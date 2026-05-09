import { cn } from "@/lib/utils";
import { CRITIQUE_TONES } from "@/lib/mock-data";

interface ToneSelectorProps {
  value: string;
  onChange: (tone: string) => void;
  className?: string;
}

export function ToneSelector({ value, onChange, className }: ToneSelectorProps) {
  return (
    <div className={cn("flex gap-1 font-display", className)}>
      {CRITIQUE_TONES.map((tone) => (
        <button
          key={tone.id}
          type="button"
          onClick={() => onChange(tone.id)}
          className={cn(
            "rounded-pill border px-2.5 py-1 text-[10px] font-medium transition-colors",
            value === tone.id
              ? "border-[var(--c-primary)] bg-[var(--c-primary)] text-[var(--c-on-primary)]"
              : "border-[var(--c-hairline)] bg-transparent text-[var(--c-muted)]",
          )}
        >
          {tone.label}
        </button>
      ))}
    </div>
  );
}
