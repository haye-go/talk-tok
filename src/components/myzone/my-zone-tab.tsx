import { Swords, Timer } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/state/loading-state";
import { categoryColorToTone } from "@/lib/category-colors";
import { MOCK_SUBMISSION } from "@/lib/mock-data";

interface Submission {
  id: string;
  body: string;
  kind: string;
  wordCount: number;
  compositionMs?: number;
  inputPattern: string;
  createdAt: number;
  followUpTitle?: string;
}

interface FeedbackSummary {
  submissionId: string;
  status: string;
  originalityBand?: string | null;
}

interface Assignment {
  submissionId: string;
  categoryName?: string | null;
  categoryId: string;
}

interface RecatRequest {
  submissionId: string;
  status: string;
  suggestedCategoryName?: string | null;
}

interface FightRecord {
  id: string;
  slug: string;
  mode: string;
  status: string;
  createdAt: number;
}

interface MyZoneTabProps {
  initialResponses?: Submission[];
  followUpResponses?: (Submission & { followUpTitle?: string })[];
  feedbackBySubmission?: FeedbackSummary[];
  assignmentsBySubmission?: Assignment[];
  recategorisationRequests?: RecatRequest[];
  fightThreads?: FightRecord[];
  loading?: boolean;
  onViewFight?: (fightSlug: string) => void;
}

function formatDuration(ms?: number) {
  if (!ms) return null;
  const sec = Math.round(ms / 1000);
  return sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`;
}

export function MyZoneTab({
  initialResponses,
  followUpResponses,
  feedbackBySubmission,
  assignmentsBySubmission,
  recategorisationRequests,
  fightThreads,
  loading,
  onViewFight,
}: MyZoneTabProps) {
  const feedbackMap = new Map(
    (feedbackBySubmission ?? []).map((f) => [f.submissionId, f]),
  );
  const assignmentMap = new Map(
    (assignmentsBySubmission ?? []).map((a) => [a.submissionId, a]),
  );
  const recatMap = new Map(
    (recategorisationRequests ?? []).map((r) => [r.submissionId, r]),
  );

  const initials = initialResponses ?? [
    {
      id: MOCK_SUBMISSION.id,
      body: MOCK_SUBMISSION.text,
      kind: "initial",
      wordCount: 30,
      compositionMs: MOCK_SUBMISSION.telemetry.durationMs,
      inputPattern: "composed_gradually",
      createdAt: MOCK_SUBMISSION.createdAt,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="-mx-4 -mt-4 bg-[var(--c-sig-peach)] px-4 py-4">
        <h2 className="font-display text-lg font-medium text-[var(--c-on-sig-light)]">My Zone</h2>
        <p className="text-xs text-[var(--c-on-sig-light-body)]" style={{ opacity: 0.7 }}>
          Your responses and analysis
        </p>
      </div>

      {loading && <LoadingState label="Loading your responses..." />}

      {!loading && initials.length === 0 && (
        <p className="text-sm text-[var(--c-muted)]">Your submitted responses appear here.</p>
      )}

      {initials.map((sub) => {
        const assignment = assignmentMap.get(sub.id);
        const feedback = feedbackMap.get(sub.id);
        const recat = recatMap.get(sub.id);
        const duration = formatDuration(sub.compositionMs);

        return (
          <div key={sub.id}>
            <div
              className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
              style={{
                borderLeft: assignment
                  ? `3px solid var(--c-sig-${categoryColorToTone(undefined, 0)})`
                  : undefined,
              }}
            >
              <p className="text-xs leading-relaxed text-[var(--c-body)]">
                &ldquo;{sub.body.length > 200 ? `${sub.body.slice(0, 200)}...` : sub.body}&rdquo;
              </p>
              <div className="mt-2 flex items-center justify-between">
                {assignment?.categoryName ? (
                  <Badge tone={categoryColorToTone(undefined, 0)}>{assignment.categoryName}</Badge>
                ) : (
                  <Badge tone="neutral">Uncategorized</Badge>
                )}
                <span className="text-[10px] text-[var(--c-muted)]">
                  {new Date(sub.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="mt-1.5 flex gap-1.5">
                {feedback && (
                  <span className="rounded bg-[var(--c-surface-strong)] px-1.5 py-0.5 text-[10px] text-[var(--c-sig-mustard)]">
                    {feedback.status === "success"
                      ? `Originality: ${feedback.originalityBand?.replace(/_/g, " ") ?? "—"}`
                      : feedback.status === "error"
                        ? "Feedback failed"
                        : "Analyzing..."}
                  </span>
                )}
                {duration && (
                  <span className="rounded bg-[var(--c-surface-strong)] px-1.5 py-0.5 text-[10px] text-[var(--c-success)]">
                    <Timer size={10} className="mr-0.5 inline" />
                    {duration}
                  </span>
                )}
              </div>
            </div>

            {recat && (
              <div
                className="mt-2 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
                style={{ borderLeft: "3px solid var(--c-sig-yellow)" }}
              >
                <p className="font-display text-xs font-medium text-[var(--c-sig-mustard)]">
                  Re-categorization request
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--c-muted)]">
                  {recat.suggestedCategoryName ?? "Different category"} →{" "}
                  {recat.status === "approved" && <span className="text-[var(--c-success)]">Approved ✓</span>}
                  {recat.status === "rejected" && <span className="text-[var(--c-error)]">Rejected</span>}
                  {recat.status === "pending" && <span className="text-[var(--c-sig-mustard)]">Pending</span>}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Follow-up responses */}
      {(followUpResponses ?? []).map((sub) => (
        <div
          key={sub.id}
          className="ml-4 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
          style={{ borderLeft: "2px solid var(--c-muted)" }}
        >
          <p className="mb-0.5 text-[10px] text-[var(--c-muted)]">
            {sub.followUpTitle ? `Reply to: ${sub.followUpTitle}` : "Follow-up"}
          </p>
          <p className="text-xs leading-relaxed text-[var(--c-body)]">
            &ldquo;{sub.body.length > 150 ? `${sub.body.slice(0, 150)}...` : sub.body}&rdquo;
          </p>
        </div>
      ))}

      {/* Fight Me records */}
      {(fightThreads ?? []).map((fight) => (
        <div
          key={fight.id}
          className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
          style={{ borderLeft: "3px solid var(--c-sig-coral)" }}
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-semibold text-[var(--c-sig-coral)]">
              <Swords size={12} className="mr-0.5 inline" />
              Fight Me {fight.mode === "vs_ai" ? "vs AI" : "1v1"}
            </span>
            <Badge tone={fight.status === "completed" ? "success" : fight.status === "active" ? "sky" : "neutral"}>
              {fight.status}
            </Badge>
          </div>
          <p className="mt-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => onViewFight?.(fight.slug)}
              className="text-[var(--c-link)] underline"
            >
              View thread
            </button>
          </p>
        </div>
      ))}
    </div>
  );
}
