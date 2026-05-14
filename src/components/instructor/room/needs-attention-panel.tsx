import { useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CategoryRef {
  id: Id<"categories">;
  name: string;
}

export interface NeedsAttentionPanelProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
  uncategorizedCount: number;
  pendingRecategorisationCount: number;
  failedLiveJobCount: number;
  categories: CategoryRef[];
}

export function NeedsAttentionPanel({
  sessionSlug,
  selectedQuestionId,
  uncategorizedCount,
  pendingRecategorisationCount,
  failedLiveJobCount,
  categories,
}: NeedsAttentionPanelProps) {
  const pendingRequests = useQuery(api.recategorisation.listForSession, {
    sessionSlug,
    status: "pending",
  });
  const pendingAssignmentReviews = useQuery(api.categorisation.listAssignmentReviews, {
    sessionSlug,
    questionId: selectedQuestionId,
    status: "pending",
    limit: 4,
  });
  const decideRecategorisation = useMutation(api.recategorisation.decide);
  const assignCategories = useMutation(api.categorisation.assignCategories);
  const setSubmissionCategory = useMutation(api.categorisation.setSubmissionCategory);

  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const pendingAssignmentReviewCount = pendingAssignmentReviews?.length ?? 0;
  const totalCount =
    uncategorizedCount +
    pendingRecategorisationCount +
    failedLiveJobCount +
    pendingAssignmentReviewCount;

  async function handleDecide(
    requestId: Id<"recategorizationRequests">,
    decision: "approved" | "rejected",
    categoryId?: Id<"categories">,
  ) {
    setDecidingId(requestId);
    try {
      await decideRecategorisation({
        sessionSlug,
        requestId,
        decision,
        categoryId,
      });
    } finally {
      setDecidingId(null);
    }
  }

  async function handleAssignUncategorised() {
    setAssigning(true);
    try {
      await assignCategories({
        sessionSlug,
        questionId: selectedQuestionId,
        scope: "uncategorised_posts",
      });
    } finally {
      setAssigning(false);
    }
  }

  async function handleAssignmentReview(
    reviewId: string,
    submissionId: Id<"submissions">,
    categoryId?: Id<"categories">,
  ) {
    setReviewingId(reviewId);
    try {
      await setSubmissionCategory({
        sessionSlug,
        submissionId,
        categoryId,
        rationale: categoryId
          ? "Instructor accepted suggested category."
          : "Instructor cleared category.",
      });
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <details
      open
      className="rounded-2xl border border-[#ead7b8] bg-gradient-to-b from-[#fffaf2] to-[#fffdf8]"
    >
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3">
        <span className="inline-flex items-center gap-2 font-display text-sm font-semibold text-[var(--c-ink)]">
          <WarningCircle size={16} />
          Needs Attention
        </span>
        <Badge tone={totalCount > 0 ? "warning" : "success"}>{totalCount}</Badge>
      </summary>
      <div className="grid gap-3 border-t border-[#ead7b8] px-5 py-3 text-sm">
        {uncategorizedCount > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-[var(--c-ink)]">
                {uncategorizedCount} root thread{uncategorizedCount === 1 ? "" : "s"} still
                uncategorized
              </p>
              <p className="text-xs text-[var(--c-muted)]">
                Quick triage - assign categories now or handle manually.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void handleAssignUncategorised()}
              disabled={assigning}
            >
              {assigning ? "Assigning..." : "Assign uncategorised"}
            </Button>
          </div>
        ) : null}

        {pendingAssignmentReviews && pendingAssignmentReviews.length > 0 ? (
          <div className="grid gap-2">
            <p className="font-medium text-[var(--c-ink)]">
              {pendingAssignmentReviews.length} category suggestion
              {pendingAssignmentReviews.length === 1 ? "" : "s"} need review
            </p>
            {pendingAssignmentReviews.map((review) => {
              const suggestedCategory = review.suggestedCategoryId
                ? categoryById.get(review.suggestedCategoryId)
                : null;
              const busy = reviewingId === review.id;
              const preview = review.submissionBody ?? "Submission unavailable.";

              return (
                <div
                  key={review.id}
                  className="grid gap-2 rounded-md border border-[var(--c-hairline)] bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-[var(--c-ink)]">
                      {suggestedCategory
                        ? `Suggested: ${suggestedCategory.name}`
                        : review.decision === "none"
                          ? "Suggested: no category"
                          : "Needs instructor choice"}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--c-muted)]">
                      {preview}
                    </p>
                    {review.rationale ? (
                      <p className="mt-1 line-clamp-2 text-[11px] text-[var(--c-muted)]">
                        {review.rationale}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void handleAssignmentReview(review.id, review.submissionId)}
                    >
                      No category
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy || !review.suggestedCategoryId}
                      onClick={() =>
                        void handleAssignmentReview(
                          review.id,
                          review.submissionId,
                          review.suggestedCategoryId ?? undefined,
                        )
                      }
                    >
                      {busy ? "..." : "Accept"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {pendingRequests && pendingRequests.length > 0 ? (
          <div className="grid gap-2">
            <p className="font-medium text-[var(--c-ink)]">
              {pendingRequests.length} thread{pendingRequests.length === 1 ? "" : "s"} pending
              recategorisation
            </p>
            {pendingRequests.slice(0, 4).map((request) => {
              const requestedCategory = request.requestedCategoryId
                ? categoryById.get(request.requestedCategoryId)
                : null;
              const canApprove = Boolean(request.requestedCategoryId);
              const busy = decidingId === request.id;

              return (
                <div
                  key={request.id}
                  className="flex items-center gap-3 rounded-md border border-[var(--c-hairline)] bg-white px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[var(--c-ink)]">
                      {requestedCategory
                        ? `Move to ${requestedCategory.name}`
                        : `Suggested: ${request.suggestedCategoryName ?? "New category"}`}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-[var(--c-muted)]">
                      {request.reason}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void handleDecide(request.id, "rejected")}
                    >
                      Reject
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy || !canApprove}
                      onClick={() =>
                        void handleDecide(
                          request.id,
                          "approved",
                          request.requestedCategoryId ?? undefined,
                        )
                      }
                    >
                      {busy ? "..." : "Accept"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {failedLiveJobCount > 0 ? (
          <p className="text-[var(--c-error)]">
            {failedLiveJobCount} live AI job{failedLiveJobCount === 1 ? "" : "s"} need review.
          </p>
        ) : null}

        {totalCount === 0 ? (
          <p className="text-[var(--c-muted)]">No live issues for the selected question.</p>
        ) : null}
      </div>
    </details>
  );
}
