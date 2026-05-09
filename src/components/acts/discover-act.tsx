import { FeedbackCard } from "@/components/feedback/feedback-card";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { MOCK_CATEGORIES, MOCK_FEEDBACK, MOCK_SUBMISSION } from "@/lib/mock-data";

interface DiscoverActProps {
  feedback?: typeof MOCK_FEEDBACK;
  categories?: typeof MOCK_CATEGORIES;
  placement?: { categoryName: string; categoryColor: NonNullable<BadgeProps["tone"]> };
  telemetryLabel?: string;
}

export function DiscoverAct({
  feedback = MOCK_FEEDBACK,
  categories = MOCK_CATEGORIES,
  placement = {
    categoryName: MOCK_SUBMISSION.categoryName,
    categoryColor: MOCK_SUBMISSION.categoryColor,
  },
  telemetryLabel = `${MOCK_SUBMISSION.telemetry.label} · ${Math.round(MOCK_SUBMISSION.telemetry.durationMs / 1000)}s`,
}: DiscoverActProps) {
  return (
    <div className="space-y-3">
      <FeedbackCard
        tone={feedback.tone}
        originality={feedback.originality}
        text={feedback.text}
        telemetryLabel={telemetryLabel}
      />

      <div>
        <p className="mb-1.5 text-xs text-[var(--c-muted)]">
          Emerging themes from {categories.reduce((sum, c) => sum + c.count, 0)} responses:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {categories
            .filter((c) => c.color !== "neutral")
            .map((cat) => (
              <Badge key={cat.id} tone={cat.color}>
                {cat.name}
              </Badge>
            ))}
          {categories.filter((c) => c.color === "neutral").length > 0 && (
            <Badge tone="neutral">
              +{categories.filter((c) => c.color === "neutral").length} more
            </Badge>
          )}
        </div>
      </div>

      <div
        className="rounded-md bg-[var(--c-surface-soft)] p-3"
        style={{ border: "1px solid var(--c-sig-sky)" }}
      >
        <p className="text-xs text-[var(--c-muted)]">Your response placed in:</p>
        <p className="mt-0.5 font-display text-base font-medium text-[var(--c-sig-slate)]">
          {placement.categoryName}
        </p>
        <p className="mt-1 text-[10px]">
          <a href="#" className="text-[var(--c-link)] underline">
            Request re-categorization
          </a>{" "}
          ·{" "}
          <a href="#" className="text-[var(--c-link)] underline">
            Add follow-up
          </a>
        </p>
      </div>
    </div>
  );
}
