import { FeedbackCard } from "@/components/feedback/feedback-card";
import { Badge } from "@/components/ui/badge";
import { categoryColorToTone } from "@/lib/category-colors";
import { MOCK_CATEGORIES, MOCK_FEEDBACK, MOCK_SUBMISSION } from "@/lib/mock-data";

interface CategorySummary {
  id: string;
  name: string;
  color?: string | null;
  assignmentCount: number;
}

interface FeedbackData {
  status: "queued" | "processing" | "success" | "error";
  tone: string;
  reasoningBand?: string | null;
  originalityBand?: string | null;
  specificityBand?: string | null;
  summary?: string | null;
  strengths?: string | null;
  improvement?: string | null;
  nextQuestion?: string | null;
  error?: string | null;
}

interface AssignmentData {
  categoryName?: string | null;
  categorySlug?: string | null;
  categoryId: string;
}

interface DiscoverActProps {
  feedback?: FeedbackData | null;
  categories?: CategorySummary[];
  assignment?: AssignmentData | null;
  telemetryLabel?: string;
  onRequestRecategorisation?: () => void;
  onAddFollowUp?: () => void;
}

export function DiscoverAct({
  feedback,
  categories,
  assignment,
  telemetryLabel,
  onRequestRecategorisation,
  onAddFollowUp,
}: DiscoverActProps) {
  const cats =
    categories ??
    MOCK_CATEGORIES.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      assignmentCount: c.count,
    }));

  const fb: FeedbackData = feedback ?? {
    status: "success" as const,
    tone: MOCK_FEEDBACK.tone,
    originalityBand: "above_average",
    reasoningBand: "solid",
    specificityBand: "clear",
    summary: MOCK_FEEDBACK.text,
    strengths: null,
    improvement: null,
    nextQuestion: null,
    error: null,
  };

  const placementName = assignment?.categoryName ?? MOCK_SUBMISSION.categoryName;

  const totalResponses = cats.reduce((sum, c) => sum + c.assignmentCount, 0);

  return (
    <div className="space-y-3">
      <FeedbackCard
        status={fb.status}
        tone={fb.tone}
        reasoningBand={fb.reasoningBand}
        originalityBand={fb.originalityBand}
        specificityBand={fb.specificityBand}
        summary={fb.summary}
        strengths={fb.strengths}
        improvement={fb.improvement}
        nextQuestion={fb.nextQuestion}
        error={fb.error}
        telemetryLabel={telemetryLabel}
      />

      {cats.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-[var(--c-muted)]">
            Emerging themes from {totalResponses} responses:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {cats.map((cat, i) => (
              <Badge key={cat.id} tone={categoryColorToTone(cat.color, i)}>
                {cat.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {placementName && (
        <div
          className="rounded-md bg-[var(--c-surface-soft)] p-3"
          style={{ border: "1px solid var(--c-sig-sky)" }}
        >
          <p className="text-xs text-[var(--c-muted)]">Your response placed in:</p>
          <p className="mt-0.5 font-display text-base font-medium text-[var(--c-sig-slate)]">
            {placementName}
          </p>
          <p className="mt-1 text-[10px]">
            <button
              type="button"
              onClick={onRequestRecategorisation}
              className="text-[var(--c-link)] underline"
            >
              Request re-categorization
            </button>
            {" · "}
            <button
              type="button"
              onClick={onAddFollowUp}
              className="text-[var(--c-link)] underline"
            >
              Add follow-up
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
