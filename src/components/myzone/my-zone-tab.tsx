import { ArrowsClockwise, CircleNotch, Sword, Timer } from "@phosphor-icons/react";
import { FeedbackCard } from "@/components/feedback/feedback-card";
import { ParticipantStateSection } from "@/components/layout/participant-state-section";
import { LoadingState } from "@/components/state/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { categoryColorToTone } from "@/lib/category-colors";

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

interface PositionShift {
  id: string;
  reason: string;
  influencedBy?: string | null;
  createdAt: number;
}

interface FightRecord {
  id: string;
  slug: string;
  mode: string;
  status: string;
  createdAt: number;
}

interface PersonalReportSummary {
  id: string;
  status: string;
  participationBand?: string | null;
  reasoningBand?: string | null;
  originalityBand?: string | null;
  responsivenessBand?: string | null;
  summary?: string | null;
  contributionTrace?: string | null;
  argumentEvolution?: string | null;
  growthOpportunity?: string | null;
  error?: string | null;
}

interface MyZoneTabProps {
  initialResponses?: Submission[];
  followUpResponses?: (Submission & { followUpTitle?: string })[];
  feedbackBySubmission?: FeedbackSummary[];
  assignmentsBySubmission?: Assignment[];
  recategorisationRequests?: RecatRequest[];
  fightThreads?: FightRecord[];
  positionShifts?: PositionShift[];
  personalReport?: PersonalReportSummary | null;
  personalReportsVisible?: boolean;
  loading?: boolean;
  onViewFight?: (fightSlug: string) => void;
  onViewReport?: () => void;
}

function formatDuration(ms?: number) {
  if (!ms) return null;
  const sec = Math.round(ms / 1000);
  return sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`;
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const BAND_LABELS: Record<string, string> = {
  quiet: "Quiet",
  active: "Active",
  highly_active: "Highly Active",
  emerging: "Emerging",
  solid: "Solid",
  strong: "Strong",
  exceptional: "Exceptional",
  common: "Common",
  above_average: "Above Avg",
  distinctive: "Distinctive",
  novel: "Novel",
  limited: "Limited",
  responsive: "Responsive",
  highly_responsive: "Highly Responsive",
};

export function MyZoneTab({
  initialResponses,
  followUpResponses,
  feedbackBySubmission,
  assignmentsBySubmission,
  recategorisationRequests,
  fightThreads,
  positionShifts,
  personalReport,
  personalReportsVisible = false,
  loading,
  onViewFight,
  onViewReport,
}: MyZoneTabProps) {
  const feedbackMap = new Map((feedbackBySubmission ?? []).map((feedback) => [feedback.submissionId, feedback]));
  const assignmentMap = new Map((assignmentsBySubmission ?? []).map((assignment) => [assignment.submissionId, assignment]));
  const recatMap = new Map((recategorisationRequests ?? []).map((request) => [request.submissionId, request]));
  const initials = initialResponses ?? [];

  return (
    <div className="space-y-4">
      {!personalReportsVisible ? (
        <Card
          title={
            personalReport?.status === "success"
              ? "Personal report generated, not released here"
              : "Personal report not released"
          }
          action={
            onViewReport ? (
              <Button type="button" variant="ghost" size="sm" onClick={onViewReport}>
                Open report page
              </Button>
            ) : null
          }
        >
          <p className="text-sm text-[var(--c-muted)]">
            {personalReport?.status === "success"
              ? "Your private report exists. The instructor has not released report cards into this question view yet."
              : personalReport?.status === "queued" || personalReport?.status === "processing"
                ? "Your private report is generating. It will stay separate from this question view until the instructor releases reports."
                : "The instructor has not released personal reports for this question yet. You can still use the private report page."}
          </p>
        </Card>
      ) : personalReport?.status === "success" ? (
        <Card
          title="Private comparison notes"
          action={
            onViewReport ? (
              <Button type="button" variant="ghost" size="sm" onClick={onViewReport}>
                View full report
              </Button>
            ) : null
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {personalReport.participationBand ? (
              <Badge tone="sky">
                {BAND_LABELS[personalReport.participationBand] ?? personalReport.participationBand}
              </Badge>
            ) : null}
            {personalReport.reasoningBand ? (
              <Badge tone="peach">
                {BAND_LABELS[personalReport.reasoningBand] ?? personalReport.reasoningBand}
              </Badge>
            ) : null}
            {personalReport.originalityBand ? (
              <Badge tone="mustard">
                {BAND_LABELS[personalReport.originalityBand] ?? personalReport.originalityBand}
              </Badge>
            ) : null}
            {personalReport.responsivenessBand ? (
              <Badge tone="cream">
                {BAND_LABELS[personalReport.responsivenessBand] ??
                  personalReport.responsivenessBand}
              </Badge>
            ) : null}
          </div>
          {personalReport.summary ? (
            <p className="mt-3 text-sm leading-relaxed text-[var(--c-body)]">
              {personalReport.summary}
            </p>
          ) : null}
          {personalReport.argumentEvolution ? (
            <div className="mt-3">
              <p className="text-xs font-medium text-[var(--c-muted)]">Argument evolution</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--c-body)]">
                {personalReport.argumentEvolution}
              </p>
            </div>
          ) : null}
          {personalReport.growthOpportunity ? (
            <div className="mt-3 rounded-md bg-[var(--c-sig-cream)] p-3">
              <p className="text-xs font-medium text-[var(--c-sig-mustard)]">Growth opportunity</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--c-on-sig-light-body)]">
                {personalReport.growthOpportunity}
              </p>
            </div>
          ) : null}
          {personalReport.contributionTrace ? (
            <div className="mt-3">
              <p className="text-xs font-medium text-[var(--c-muted)]">Contribution trace</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--c-body)]">
                {personalReport.contributionTrace}
              </p>
            </div>
          ) : null}
        </Card>
      ) : personalReport?.status === "queued" || personalReport?.status === "processing" ? (
        <ParticipantStateSection kind="waiting" title="Personal report">
          Generating your personal report...
        </ParticipantStateSection>
      ) : personalReport?.status === "error" ? (
        <Card title="Personal report failed" description={personalReport.error ?? "The personal report could not be generated yet."} />
      ) : (
        <ParticipantStateSection kind="waiting" title="Personal report">
          Your report has not been generated for this question yet.
        </ParticipantStateSection>
      )}

      {loading ? <LoadingState label="Loading your responses..." /> : null}

      {!loading && initials.length === 0 ? (
        <ParticipantStateSection kind="empty" title="Contributions">
          No contributions yet. Your submitted responses will appear here.
        </ParticipantStateSection>
      ) : null}

      {initials.map((submission) => {
        const assignment = assignmentMap.get(submission.id);
        const feedback = feedbackMap.get(submission.id);
        const recat = recatMap.get(submission.id);
        const duration = formatDuration(submission.compositionMs);

        return (
          <Card
            key={submission.id}
            eyebrow={submission.kind === "initial" ? "Original post" : "Additional point"}
            title="Your contribution"
            action={
              <span className="text-[10px] text-[var(--c-muted)]">
                {formatTime(submission.createdAt)}
              </span>
            }
            className="space-y-3"
          >
            <p className="text-sm leading-relaxed text-[var(--c-body)]">{submission.body}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--c-muted)]">
              {assignment?.categoryName ? (
                <Badge tone={categoryColorToTone(undefined, 0)}>{assignment.categoryName}</Badge>
              ) : (
                <Badge tone="neutral">Uncategorized</Badge>
              )}
              <span>{submission.wordCount} words</span>
              {duration ? (
                <span>
                  <Timer size={11} className="mr-0.5 inline" />
                  {duration}
                </span>
              ) : null}
            </div>

            {feedback ? (
              <>
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
                {feedback.status === "success" ? (
                  <p className="text-xs text-[var(--c-muted)]">
                    This private feedback compares your contribution against a hidden instructor
                    baseline and, when enough responses exist, the cohort context.
                  </p>
                ) : null}
              </>
            ) : null}

            {recat ? (
              <div className="rounded-md border border-[var(--c-hairline)] border-l-[3px] border-l-[var(--c-sig-yellow)] bg-[var(--c-surface-soft)] p-3">
                <p className="font-display text-xs font-medium text-[var(--c-sig-mustard)]">
                  Re-categorization request
                </p>
                <p className="mt-1 text-xs text-[var(--c-muted)]">
                  {recat.suggestedCategoryName ?? "Different category"} - {recat.status}
                </p>
              </div>
            ) : null}
          </Card>
        );
      })}

      {(followUpResponses ?? []).length > 0 ? (
        <Card title="Follow-ups">
          <div className="space-y-2">
            {(followUpResponses ?? []).map((submission) => (
              <div
                key={submission.id}
                className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
              >
                <p className="text-[10px] text-[var(--c-muted)]">
                  {submission.followUpTitle ? `Follow-up: ${submission.followUpTitle}` : "Follow-up"} -{" "}
                  {formatTime(submission.createdAt)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--c-body)]">
                  {submission.body}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {(positionShifts ?? []).length > 0 ? (
        <Card title="Position shifts">
          <div className="space-y-2">
            {(positionShifts ?? []).map((shift) => (
              <div
                key={shift.id}
                className="rounded-md border border-[var(--c-hairline)] border-l-[3px] border-l-[var(--c-sig-mustard)] bg-[var(--c-surface-soft)] p-3"
              >
                <p className="flex items-center gap-1 text-xs font-medium text-[var(--c-sig-mustard)]">
                  <ArrowsClockwise size={12} />
                  Position shift
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--c-body)]">{shift.reason}</p>
                {shift.influencedBy ? (
                  <p className="mt-1 text-xs text-[var(--c-muted)]">
                    Influenced by: {shift.influencedBy}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {(fightThreads ?? []).length > 0 ? (
        <Card title="Fight history">
          <div className="space-y-2">
            {(fightThreads ?? []).map((fight) => (
              <div
                key={fight.id}
                className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-xs font-semibold text-[var(--c-tab-fight)]">
                    <Sword size={12} className="mr-0.5 inline" />
                    {fight.mode === "vs_ai" ? "Fight vs AI" : "Fight 1v1"}
                  </span>
                  <Badge
                    tone={
                      fight.status === "completed"
                        ? "success"
                        : fight.status === "active"
                          ? "sky"
                          : "neutral"
                    }
                  >
                    {fight.status}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-[var(--c-muted)]">
                    {formatTime(fight.createdAt)}
                  </span>
                  {onViewFight ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewFight(fight.slug)}
                    >
                      View thread
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
