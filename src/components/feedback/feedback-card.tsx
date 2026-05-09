import { Fire, Timer } from "@phosphor-icons/react";
import { OriginalitySlider } from "@/components/feedback/originality-slider";

interface FeedbackCardProps {
  tone: string;
  originality: number;
  text: string;
  telemetryLabel?: string;
}

export function FeedbackCard({ tone, originality, text, telemetryLabel }: FeedbackCardProps) {
  return (
    <div className="rounded-md bg-[var(--c-sig-cream)] p-3.5" style={{ borderLeft: "3px solid var(--c-sig-peach)" }}>
      <div className="mb-1.5 font-display text-xs font-semibold text-[var(--c-sig-coral)]">
        <Fire size={12} weight="fill" className="mr-1 inline" />
        Your AI Feedback · {tone.charAt(0).toUpperCase() + tone.slice(1)}
      </div>

      <OriginalitySlider value={originality} className="mb-2" />

      <p className="text-xs leading-relaxed text-[var(--c-on-sig-light-body)]">
        &ldquo;{text}&rdquo;
      </p>

      {telemetryLabel && (
        <p className="mt-1.5 text-[10px] text-[var(--c-on-sig-light-body)]" style={{ opacity: 0.6 }}>
          <Timer size={10} className="mr-0.5 inline" />
          {telemetryLabel}
        </p>
      )}
    </div>
  );
}
