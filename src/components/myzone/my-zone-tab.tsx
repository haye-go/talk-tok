import { useState } from "react";
import {
  ArrowsClockwise,
  ChatText,
  ListBullets,
  Sword,
  Timer,
} from "@phosphor-icons/react";
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
  const followUps = followUpResponses ?? [];
  const fights = fightThreads ?? [];
  const shifts = positionShifts ?? [];

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const contributionCount = initials.length;
  const followUpCount = followUps.length;
  const fightCount = fights.length;
  const shiftCount = shifts.length;

  return (
    <div className="space-y-3">
      <PersonalReportSection
        personalReport={personalReport}
        personalReportsVisible={personalReportsVisible}
        onViewReport={onViewReport}
      />

      {(contributionCount > 0 || followUpCount > 0 || fightCount > 0 || shiftCount > 0) ? (
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--c-muted)]">
          {contributionCount > 0 ? (
            <span className="flex items-center gap-1">
              <ListBullets size={12} />
              {contributionCount} {contributionCount === 1 ? "contribution" : "contributions"}
            </span>
          ) : null}
          {followUpCount > 0 ? (
            <span className="flex items-center gap-1">
              <ChatText size={12} />
              {followUpCount} {followUpCount === 1 ? "follow-up" : "follow-ups"}
            </span>
          ) : null}
          {fightCount > 0 ? (
            <span className="flex items-center gap-1">
              <Sword size={12} />
              {fightCount} {fightCount === 1 ? "fight" : "fights"}
            </span>
          ) : null}
          {shiftCount > 0 ? (
            <span className="flex items-center gap-1">
              <ArrowsClockwise size={12} />
              {shiftCount} {shiftCount === 1 ? "shift" : "shifts"}
            </span>
          ) : null}
        </div>
      ) : null}

      {loading ? <LoadingState label="Loading your activity..." /> : null}

      {!loading && initials.length === 0 ? (
        <ParticipantStateSection kind="empty" title="Contributions">
          No contributions yet. Your submitted responses will appear here.
        </ParticipantStateSection>
      ) : null}

      {initials.length > 0 ? (
        <div className="space-y-1.5">
          {initials.map((submission) => {
            const assignment = assignmentMap.get(submission.id);
            const feedback = feedbackMap.get(submission.id);
            const recat = recatMap.get(submission.id);
            const isExpanded = expandedId === submission.id;

            return (
              <ContributionRow
                key={submission.id}
                submission={submission}
                assignment={assignment}
                feedback={feedback}
                recat={recat}
                expanded={isExpanded}
                onToggle={() => setExpandedId(isExpanded ? null : submission.id)}
              />
            );
          })}
        </div>
      ) : null}

      {followUps.length > 0 ? (
        <Card title="Reply archive" description="Thread replies are archived here; active thread work stays in Contribute.">
          <div className="flex flex-col gap-2">
            {followUps.map((submission) => (
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

      {fights.length > 0 ? (
        <Card title="Fight history">
          <div className="space-y-2">
            {fights.map((fight) => (
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

      {shifts.length > 0 ? (
        <Card title="Position shifts">
          <div className="space-y-2">
            {shifts.map((shift) => (
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
    </div>
  );
}

function PersonalReportSection({
  personalReport,
  personalReportsVisible,
  onViewReport,
}: {
  personalReport?: PersonalReportSummary | null;
  personalReportsVisible: boolean;
  onViewReport?: () => void;
}) {
  if (!personalReportsVisible) {
    if (personalReport?.status === "queued" || personalReport?.status === "processing") {
      return (
        <ParticipantStateSection kind="waiting" title="Your report">
          Your private report is generating.
        </ParticipantStateSection>
      );
    }

    return (
      <ParticipantStateSection kind="hidden" title="Your report">
        Reports are not available yet.
        {onViewReport ? (
          <Button type="button" variant="ghost" size="sm" onClick={onViewReport} className="mt-1">
            Open report page
          </Button>
        ) : null}
      </ParticipantStateSection>
    );
  }

  if (personalReport?.status === "success") {
    return (
      <Card
        title="Your private report"
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
        {personalReport.growthOpportunity ? (
          <div className="mt-3 rounded-md bg-[var(--c-sig-cream)] p-3">
            <p className="text-xs font-medium text-[var(--c-sig-mustard)]">Growth opportunity</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--c-on-sig-light-body)]">
              {personalReport.growthOpportunity}
            </p>
          </div>
        ) : null}
      </Card>
    );
  }

  if (personalReport?.status === "queued" || personalReport?.status === "processing") {
    return (
      <ParticipantStateSection kind="waiting" title="Your report">
        Your private report is generating.
      </ParticipantStateSection>
    );
  }

  if (personalReport?.status === "error") {
    return (
      <Card title="Report unavailable" description={personalReport.error ?? "Your report could not be generated. The instructor has been notified."} />
    );
  }

  return (
    <ParticipantStateSection kind="waiting" title="Your report">
      Your report has not been generated yet.
    </ParticipantStateSection>
  );
}

function ContributionRow({
  submission,
  assignment,
  feedback,
  recat,
  expanded,
  onToggle,
}: {
  submission: Submission;
  assignment?: Assignment;
  feedback?: FeedbackSummary;
  recat?: RecatRequest;
  expanded: boolean;
  onToggle: () => void;
}) {
  const snippet = submission.body.length > 120
    ? submission.body.slice(0, 120) + "..."
    : submission.body;

  const feedbackBadge = feedback
    ? feedback.status === "success"
      ? "sky"
      : feedback.status === "error"
        ? "error"
        : "neutral"
    : null;

  return (
    <div className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-start gap-2 p-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-[var(--c-body)]">
            {expanded ? submission.body : snippet}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-[var(--c-muted)]">
              <Timer size={10} className="mr-0.5 inline" />
              {formatTime(submission.createdAt)}
            </span>
            {assignment?.categoryName ? (
              <Badge tone={categoryColorToTone(undefined, 0)}>{assignment.categoryName}</Badge>
            ) : null}
            {feedbackBadge ? (
              <Badge tone={feedbackBadge as "sky" | "error" | "neutral"}>
                {feedback?.status === "success" ? "Feedback ready" : feedback?.status === "error" ? "Feedback failed" : "Pending"}
              </Badge>
            ) : null}
            {recat ? (
              <Badge tone="mustard">Recat {recat.status}</Badge>
            ) : null}
          </div>
        </div>
        <span className="shrink-0 text-[10px] text-[var(--c-muted)]">
          {expanded ? "Collapse" : "Details"}
        </span>
      </button>

      {expanded ? (
        <div className="flex flex-col gap-3 border-t border-[var(--c-hairline)] p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--c-muted)]">
            <span>{submission.wordCount} words</span>
            <span>{submission.kind === "initial" ? "Original post" : "Additional point"}</span>
          </div>

          {feedback ? (
            <div className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-canvas)] p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={feedback.status === "success" ? "sky" : feedback.status === "error" ? "error" : "neutral"}>
                  Feedback {feedback.status}
                </Badge>
                {feedback.reasoningBand ? (
                  <Badge tone="neutral">
                    {BAND_LABELS[feedback.reasoningBand] ?? feedback.reasoningBand}
                  </Badge>
                ) : null}
              </div>
              {feedback.summary ? (
                <p className="mt-2 text-xs leading-relaxed text-[var(--c-body)]">
                  {feedback.summary}
                </p>
              ) : feedback.error ? (
                <p className="mt-2 text-xs leading-relaxed text-[var(--c-error)]">
                  {feedback.error}
                </p>
              ) : null}
            </div>
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
        </div>
      ) : null}
    </div>
  );
}
