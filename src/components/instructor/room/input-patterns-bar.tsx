import { Card } from "@/components/ui/card";
import { inputPatternLabel, type InputPattern } from "@/lib/submission-telemetry";

export interface InputPatternsBarProps {
  patternCounts: Record<InputPattern, number>;
}

export function InputPatternsBar({ patternCounts }: InputPatternsBarProps) {
  return (
    <Card title="Input Patterns">
      <div className="grid gap-1.5 text-sm">
        {(Object.keys(patternCounts) as InputPattern[]).map((pattern) => (
          <div key={pattern} className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--c-body)]">{inputPatternLabel(pattern)}</span>
            <span className="font-mono text-xs text-[var(--c-ink)]">{patternCounts[pattern]}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
