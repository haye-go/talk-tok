import { cn } from "@/lib/utils";

interface OriginalitySliderProps {
  value: number;
  className?: string;
}

export function OriginalitySlider({ value, className }: OriginalitySliderProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="w-14 text-[10px] text-[var(--c-on-sig-light-body)]" style={{ opacity: 0.7 }}>
        Originality
      </span>
      <div
        className="h-1.5 flex-1 rounded-pill bg-[var(--c-hairline)]"
        style={{ background: "oklch(0.88 0.01 82)" }}
      >
        <div
          className="h-full rounded-pill bg-[var(--c-sig-mustard)] transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
