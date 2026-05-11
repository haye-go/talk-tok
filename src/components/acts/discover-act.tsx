import { useState, type FormEvent } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { FeedbackCard } from "@/components/feedback/feedback-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { categoryColorToTone } from "@/lib/category-colors";

interface CategorySummary {
  id: Id<"categories">;
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
  categoryId: Id<"categories">;
}

interface RecategorisationRequestInput {
  requestedCategoryId?: Id<"categories">;
  suggestedCategoryName?: string;
  reason: string;
}

interface RecategorisationRequestData {
  status: string;
  suggestedCategoryName?: string | null;
}

interface FollowUpResponse {
  id: string;
  body: string;
  createdAt: number;
}

interface DiscoverActProps {
  mySubmissionBody?: string | null;
  followUpResponses?: FollowUpResponse[];
  feedback?: FeedbackData | null;
  categories?: CategorySummary[];
  assignment?: AssignmentData | null;
  telemetryLabel?: string;
  recategorisationRequest?: RecategorisationRequestData | null;
  onRequestRecategorisation?: (request: RecategorisationRequestInput) => Promise<void> | void;
  onAddFollowUp?: () => void;
}

export function DiscoverAct({
  mySubmissionBody,
  followUpResponses,
  feedback,
  categories,
  assignment,
  telemetryLabel,
  recategorisationRequest,
  onRequestRecategorisation,
  onAddFollowUp,
}: DiscoverActProps) {
  const [showRecatForm, setShowRecatForm] = useState(false);
  const [requestedCategoryId, setRequestedCategoryId] = useState("");
  const [suggestedCategoryName, setSuggestedCategoryName] = useState("");
  const [reason, setReason] = useState("");
  const [recatError, setRecatError] = useState<string | null>(null);
  const [recatSubmitting, setRecatSubmitting] = useState(false);
  const [recatSubmitted, setRecatSubmitted] = useState(false);
  const cats = categories ?? [];
  const placementName = assignment?.categoryName ?? null;
  const alternateCategories = cats.filter((cat) => cat.id !== assignment?.categoryId);
  const selectedCategoryId = requestedCategoryId || alternateCategories[0]?.id || "__new";
  const selectedCategory = alternateCategories.find((category) => category.id === selectedCategoryId);

  const totalResponses = cats.reduce((sum, c) => sum + c.assignmentCount, 0);

  const submissionBody = mySubmissionBody?.trim() ? mySubmissionBody : null;

  async function handleRecatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onRequestRecategorisation) return;

    const trimmedReason = reason.trim();
    const trimmedSuggested = suggestedCategoryName.trim();

    if (trimmedReason.length < 5) {
      setRecatError("Add a short reason so the instructor can review it.");
      return;
    }

    if (selectedCategoryId === "__new" && trimmedSuggested.length < 2) {
      setRecatError("Suggest a category name or choose an existing category.");
      return;
    }

    setRecatError(null);
    setRecatSubmitting(true);
    try {
      await onRequestRecategorisation({
        requestedCategoryId: selectedCategoryId === "__new" ? undefined : selectedCategory?.id,
        suggestedCategoryName: selectedCategoryId === "__new" ? trimmedSuggested : undefined,
        reason: trimmedReason,
      });
      setRecatSubmitted(true);
      setShowRecatForm(false);
    } catch (cause) {
      setRecatError(
        cause instanceof Error ? cause.message : "Could not submit recategorisation request.",
      );
    } finally {
      setRecatSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {submissionBody ? (
        <div className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--c-muted)]">
            Your response
          </p>
          <p className="text-sm leading-relaxed text-[var(--c-ink)]">{submissionBody}</p>
          {followUpResponses && followUpResponses.length > 0 && (
            <div className="mt-2 space-y-2 border-t border-[var(--c-hairline)] pt-2">
              {followUpResponses.map((fu) => (
                <div key={fu.id}>
                  <p className="mb-0.5 text-[9px] font-medium text-[var(--c-muted)]">Follow-up</p>
                  <p className="text-xs leading-relaxed text-[var(--c-body)]">{fu.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--c-muted)]">
            Your response
          </p>
          <p className="text-sm text-[var(--c-muted)]">No response submitted yet.</p>
        </div>
      )}
      {feedback ? (
        <FeedbackCard
          status={feedback.status}
          tone={feedback.tone}
          reasoningBand={feedback.reasoningBand}
          originalityBand={feedback.originalityBand}
          specificityBand={feedback.specificityBand}
          summary={feedback.summary}
          strengths={feedback.strengths}
          improvement={feedback.improvement}
          nextQuestion={feedback.nextQuestion}
          error={feedback.error}
          telemetryLabel={telemetryLabel}
        />
      ) : (
        <div className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3">
          <p className="font-display text-sm font-medium text-[var(--c-ink)]">AI feedback</p>
          <p className="mt-1 text-xs text-[var(--c-muted)]">
            Feedback will appear after you submit a response.
          </p>
        </div>
      )}

      {cats.length > 0 ? (
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
      ) : (
        <div className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3">
          <p className="text-xs text-[var(--c-muted)]">
            Categories will appear after the instructor releases them.
          </p>
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
              onClick={() => setShowRecatForm((value) => !value)}
              disabled={
                !onRequestRecategorisation ||
                recatSubmitting ||
                Boolean(recategorisationRequest) ||
                recatSubmitted
              }
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
          {(recategorisationRequest || recatSubmitted) && (
            <InlineAlert tone="success" className="mt-3 text-xs">
              Recategorisation request {recategorisationRequest?.status ?? "submitted"}.
            </InlineAlert>
          )}
          {showRecatForm &&
            onRequestRecategorisation &&
            !recategorisationRequest &&
            !recatSubmitted && (
              <form className="mt-3 grid gap-2" onSubmit={handleRecatSubmit}>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-medium text-[var(--c-muted)]">
                    Requested category
                  </span>
                  <select
                    value={selectedCategoryId}
                    onChange={(event) => setRequestedCategoryId(event.target.value)}
                    className="min-h-9 w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-2 text-xs text-[var(--c-ink)] outline-none focus:border-[var(--c-info-border)]"
                  >
                    {alternateCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                    <option value="__new">Suggest a new category</option>
                  </select>
                </label>
                {selectedCategoryId === "__new" && (
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-medium text-[var(--c-muted)]">
                      New category name
                    </span>
                    <input
                      value={suggestedCategoryName}
                      onChange={(event) => setSuggestedCategoryName(event.target.value)}
                      className="min-h-9 w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-2 text-xs text-[var(--c-ink)] outline-none focus:border-[var(--c-info-border)]"
                    />
                  </label>
                )}
                <label className="block">
                  <span className="mb-1 block text-[10px] font-medium text-[var(--c-muted)]">
                    Reason
                  </span>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="min-h-20 w-full resize-y rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-2 py-1.5 text-xs leading-5 text-[var(--c-ink)] outline-none focus:border-[var(--c-info-border)]"
                  />
                </label>
                {recatError && <InlineAlert tone="error">{recatError}</InlineAlert>}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRecatForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={recatSubmitting}>
                    {recatSubmitting ? "Submitting..." : "Submit request"}
                  </Button>
                </div>
              </form>
            )}
        </div>
      )}
    </div>
  );
}
