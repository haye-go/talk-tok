import { useState, type FormEvent, type ReactNode } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { FeedbackCard } from "@/components/feedback/feedback-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { categoryColorToTone } from "@/lib/category-colors";

interface ContributionSubmission {
  id: Id<"submissions">;
  body: string;
  kind: "initial" | "additional_point" | "reply" | "fight_me_turn";
  createdAt: number;
}

interface FollowUpResponse {
  id: Id<"submissions">;
  body: string;
  createdAt: number;
  followUpTitle?: string;
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

interface CategorySummary {
  id: Id<"categories">;
  name: string;
  color?: string | null;
  assignmentCount: number;
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

export interface ContributionThreadCardProps {
  submission: ContributionSubmission;
  feedback?: FeedbackData | null;
  assignment?: AssignmentData | null;
  categories?: CategorySummary[];
  followUps?: FollowUpResponse[];
  recategorisationRequest?: RecategorisationRequestData | null;
  expanded?: boolean;
  isLatest?: boolean;
  canStartFight?: boolean;
  onToggleExpanded?: () => void;
  onRequestRecategorisation?: (request: RecategorisationRequestInput) => Promise<void> | void;
  onAddFollowUp?: () => void;
  onViewExplore?: () => void;
  onStartFight?: () => void;
  children?: ReactNode;
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function submissionLabel(kind: ContributionSubmission["kind"]) {
  return kind === "initial" ? "Original post" : "Additional point";
}

export function ContributionThreadCard({
  submission,
  feedback,
  assignment,
  categories,
  followUps,
  recategorisationRequest,
  expanded = false,
  isLatest = false,
  canStartFight = false,
  onToggleExpanded,
  onRequestRecategorisation,
  onAddFollowUp,
  onViewExplore,
  onStartFight,
  children,
}: ContributionThreadCardProps) {
  const [showRecatForm, setShowRecatForm] = useState(false);
  const [requestedCategoryId, setRequestedCategoryId] = useState("");
  const [suggestedCategoryName, setSuggestedCategoryName] = useState("");
  const [reason, setReason] = useState("");
  const [recatError, setRecatError] = useState<string | null>(null);
  const [recatSubmitting, setRecatSubmitting] = useState(false);
  const [recatSubmitted, setRecatSubmitted] = useState(false);

  const categoryChoices = (categories ?? []).filter(
    (category) => category.id !== assignment?.categoryId,
  );
  const selectedCategoryId = requestedCategoryId || categoryChoices[0]?.id || "__new";
  const selectedCategory = categoryChoices.find((category) => category.id === selectedCategoryId);

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
    <Card
      eyebrow={submissionLabel(submission.kind)}
      title={isLatest ? "Latest contribution" : "Contribution"}
      action={
        <span className="text-[10px] text-[var(--c-muted)]">{formatTime(submission.createdAt)}</span>
      }
      className="space-y-3"
    >
      <p className="text-sm leading-relaxed text-[var(--c-body)]">{submission.body}</p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onToggleExpanded}>
          {expanded ? "Hide analysis" : "View analysis"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onAddFollowUp}>
          Add follow-up
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onViewExplore}>
          View in Explore
        </Button>
        {canStartFight ? (
          <Button type="button" size="sm" variant="ghost" onClick={onStartFight}>
            Go to Fight
          </Button>
        ) : null}
      </div>

      {children}

      {expanded ? (
        <div className="space-y-3 border-t border-[var(--c-hairline)] pt-3">
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
            />
          ) : (
            <div className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3">
              <p className="font-display text-sm font-medium text-[var(--c-ink)]">AI feedback</p>
              <p className="mt-1 text-xs text-[var(--c-muted)]">
                Feedback will appear here after you submit this contribution.
              </p>
            </div>
          )}

          {assignment ? (
            <div
              className="rounded-md bg-[var(--c-surface-soft)] p-3"
              style={{ border: "1px solid var(--c-sig-sky)" }}
            >
              <p className="text-xs text-[var(--c-muted)]">Placed in</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge tone={categoryColorToTone(undefined, 0)}>
                  {assignment.categoryName ?? "Categorized"}
                </Badge>
                <button
                  type="button"
                  onClick={() => setShowRecatForm((value) => !value)}
                  disabled={
                    !onRequestRecategorisation ||
                    recatSubmitting ||
                    Boolean(recategorisationRequest) ||
                    recatSubmitted
                  }
                  className="text-xs text-[var(--c-link)] underline"
                >
                  Request re-categorization
                </button>
              </div>
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
                        {categoryChoices.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                        <option value="__new">Suggest a new category</option>
                      </select>
                    </label>
                    {selectedCategoryId === "__new" ? (
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
                    ) : null}
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
                    {recatError ? <InlineAlert tone="error">{recatError}</InlineAlert> : null}
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
          ) : null}

          {followUps && followUps.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--c-muted)]">Follow-ups on this point</p>
              {followUps.map((followUp) => (
                <div
                  key={followUp.id}
                  className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] p-3"
                >
                  <p className="text-[10px] text-[var(--c-muted)]">
                    {followUp.followUpTitle ?? "Follow-up"} - {formatTime(followUp.createdAt)}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--c-body)]">
                    {followUp.body}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
