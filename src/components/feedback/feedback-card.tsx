import { CircleNotch, Fire, Timer, WarningCircle } from "@phosphor-icons/react";
import { OriginalitySlider } from "@/components/feedback/originality-slider";
import { Badge } from "@/components/ui/badge";

const ORIGINALITY_PCT: Record<string, number> = {
  common: 0.25,
  above_average: 0.5,
  distinctive: 0.75,
  novel: 0.95,
};

interface FeedbackCardProps {
  status: "queued" | "processing" | "success" | "error";
  tone?: string;
  reasoningBand?: string | null;
  originalityBand?: string | null;
  specificityBand?: string | null;
  summary?: string | null;
  strengths?: string | null;
  improvement?: string | null;
  nextQuestion?: string | null;
  error?: string | null;
  telemetryLabel?: string;
}

function bandLabel(band?: string | null) {
  if (!band) return null;
  return band.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function FeedbackCard({
  status,
  tone,
  reasoningBand,
  originalityBand,
  specificityBand,
  summary,
  strengths,
  improvement,
  nextQuestion,
  error,
  telemetryLabel,
}: FeedbackCardProps) {
  if (status === "queued" || status === "processing") {
    return (
      <div className="flex items-center gap-3 rounded-md bg-[var(--c-sig-cream)] p-4">
        <CircleNotch size={18} className="animate-spin text-[var(--c-sig-peach)]" />
        <div>
          <p className="font-display text-xs font-medium text-[var(--c-on-sig-light)]">
            Analyzing your response...
          </p>
          <p className="text-[10px] text-[var(--c-on-sig-light-body)]" style={{ opacity: 0.6 }}>
            AI feedback is being generated
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="flex items-center gap-3 rounded-md bg-[var(--c-surface-soft)] p-4"
        style={{ borderLeft: "3px solid var(--c-error)" }}
      >
        <WarningCircle size={18} className="text-[var(--c-error)]" />
        <div>
          <p className="font-display text-xs font-medium text-[var(--c-ink)]">Feedback failed</p>
          <p className="text-[10px] text-[var(--c-muted)]">
            {error ?? "An error occurred. Try again later."}
          </p>
        </div>
      </div>
    );
  }

  const toneDisplay = tone ? tone.charAt(0).toUpperCase() + tone.slice(1) : "";

  return (
    <div
      className="rounded-md bg-[var(--c-sig-cream)] p-3.5"
      style={{ borderLeft: "3px solid var(--c-sig-peach)" }}
    >
      <div className="mb-1.5 font-display text-xs font-semibold text-[var(--c-sig-coral)]">
        <Fire size={12} weight="fill" className="mr-1 inline" />
        Your AI Feedback{toneDisplay ? ` · ${toneDisplay}` : ""}
      </div>

      {originalityBand && (
        <OriginalitySlider value={ORIGINALITY_PCT[originalityBand] ?? 0.5} className="mb-2" />
      )}

      {/* Quality bands */}
      {(reasoningBand || specificityBand) && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {reasoningBand && (
            <Badge tone="sky" className="text-[9px]">
              Reasoning: {bandLabel(reasoningBand)}
            </Badge>
          )}
          {specificityBand && (
            <Badge tone="mustard" className="text-[9px]">
              Specificity: {bandLabel(specificityBand)}
            </Badge>
          )}
          {originalityBand && (
            <Badge tone="peach" className="text-[9px]">
              Originality: {bandLabel(originalityBand)}
            </Badge>
          )}
        </div>
      )}

      {summary && (
        <p className="text-xs leading-relaxed text-[var(--c-on-sig-light-body)]">
          &ldquo;{summary}&rdquo;
        </p>
      )}

      {strengths && (
        <div className="mt-2">
          <p className="text-[10px] font-medium text-[var(--c-success)]">Strengths</p>
          <p className="text-xs leading-relaxed text-[var(--c-on-sig-light-body)]">{strengths}</p>
        </div>
      )}

      {improvement && (
        <div className="mt-2">
          <p className="text-[10px] font-medium text-[var(--c-sig-mustard)]">Could improve</p>
          <p className="text-xs leading-relaxed text-[var(--c-on-sig-light-body)]">{improvement}</p>
        </div>
      )}

      {nextQuestion && (
        <div className="mt-2">
          <p className="text-[10px] font-medium text-[var(--c-sig-sky)]">Think about</p>
          <p className="text-xs leading-relaxed text-[var(--c-on-sig-light-body)]">
            {nextQuestion}
          </p>
        </div>
      )}

      {telemetryLabel && (
        <p
          className="mt-1.5 text-[10px] text-[var(--c-on-sig-light-body)]"
          style={{ opacity: 0.6 }}
        >
          <Timer size={10} className="mr-0.5 inline" />
          {telemetryLabel}
        </p>
      )}
    </div>
  );
}
