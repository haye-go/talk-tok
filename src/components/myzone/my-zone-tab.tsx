import { useState } from "react";
import { ArrowsClockwise, ChatText, ListBullets, Sword, Timer } from "@phosphor-icons/react";
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
  categoryName?: string | null;
  categoryId: string;
  categoryColor?: string | null;
}

interface RecatRequest {
  status: string;
  suggestedCategoryName?: string | null;
}

interface ArchiveThreadMessage {
  submission: Submission;
}

interface ArchiveThread {
  root: ArchiveThreadMessage;
  replies: ArchiveThreadMessage[];
  assignment?: Assignment | null;
  feedbackSummary?: FeedbackSummary | null;
  recategorisationRequest?: RecatRequest | null;
}

interface ArchiveQuestion {
  id: string;
  title?: string | null;
  prompt?: string | null;
  isCurrent?: boolean;
}

interface ArchiveQuestionSection {
  questionId: string | null;
  question: ArchiveQuestion | null;
  fallbackTitle: string | null;
  fallbackPrompt: string | null;
  isCurrent: boolean;
  latestActivityAt: number;
  contributionCount: number;
  replyCount: number;
  threads: ArchiveThread[];
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
  summary?: string | null;
  contributionTrace?: string | null;
  argumentEvolution?: string | null;
  error?: string | null;
}

interface MyZoneTabProps {
  myArchiveByQuestion?: ArchiveQuestionSection[];
  fightThreads?: FightRecord[];
  positionShifts?: PositionShift[];
  personalReport?: PersonalReportSummary | null;
  personalReportsVisible?: boolean;
  generatingReport?: boolean;
  loading?: boolean;
  onViewFight?: (fightSlug: string) => void;
  onViewReport?: () => void;
  onGenerateReport?: () => Promise<void>;
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
};

export function MyZoneTab({
  myArchiveByQuestion,
  fightThreads,
  positionShifts,
  personalReport,
  personalReportsVisible = false,
  generatingReport = false,
  loading,
  onViewFight,
  onViewReport,
  onGenerateReport,
}: MyZoneTabProps) {
  const archiveSections = myArchiveByQuestion ?? [];
  const fights = fightThreads ?? [];
  const shifts = positionShifts ?? [];

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const contributionCount = archiveSections.reduce(
    (count, section) => count + section.contributionCount,
    0,
  );
  const followUpCount = archiveSections.reduce((count, section) => count + section.replyCount, 0);
  const fightCount = fights.length;
  const shiftCount = shifts.length;

  return (
    <div className="space-y-3">
      <PersonalReportSection
        personalReport={personalReport}
        personalReportsVisible={personalReportsVisible}
        generatingReport={generatingReport}
        onViewReport={onViewReport}
        onGenerateReport={onGenerateReport}
      />

      {contributionCount > 0 || followUpCount > 0 || fightCount > 0 || shiftCount > 0 ? (
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

      {!loading && archiveSections.length === 0 ? (
        <ParticipantStateSection kind="empty" title="Contributions">
          No contributions yet. Your submitted responses will appear here.
        </ParticipantStateSection>
      ) : null}

      {archiveSections.length > 0 ? (
        <div className="space-y-2">
          {archiveSections.map((section) => (
            <Card
              key={section.questionId ?? "session"}
              title={section.question?.title ?? section.fallbackTitle ?? "Question"}
              description={`${section.contributionCount} ${
                section.contributionCount === 1 ? "contribution" : "contributions"
              } / ${section.replyCount} ${section.replyCount === 1 ? "reply" : "replies"}`}
            >
              <div className="space-y-1.5">
                {section.threads.map((thread) => {
                  const submission = thread.root.submission;
                  const isExpanded = expandedId === submission.id;

                  return (
                    <ContributionRow
                      key={submission.id}
                      submission={submission}
                      assignment={thread.assignment ?? undefined}
                      feedback={thread.feedbackSummary ?? undefined}
                      recat={thread.recategorisationRequest ?? undefined}
                      replies={thread.replies}
                      expanded={isExpanded}
                      onToggle={() => setExpandedId(isExpanded ? null : submission.id)}
                    />
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
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
  generatingReport,
  onViewReport,
  onGenerateReport,
}: {
  personalReport?: PersonalReportSummary | null;
  personalReportsVisible: boolean;
  generatingReport: boolean;
  onViewReport?: () => void;
  onGenerateReport?: () => Promise<void>;
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
        </div>
        {personalReport.summary ? (
          <p className="mt-3 text-sm leading-relaxed text-[var(--c-body)]">
            {personalReport.summary}
          </p>
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
      <Card
        title="Report unavailable"
        description={
          personalReport.error ??
          "Your report could not be generated. The instructor has been notified."
        }
      />
    );
  }

  return (
    <ParticipantStateSection
      kind="waiting"
      title="Your report"
      action={
        onGenerateReport ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={generatingReport}
            onClick={() => void onGenerateReport()}
          >
            {generatingReport ? "Requesting..." : "Generate report"}
          </Button>
        ) : undefined
      }
    >
      Your report has not been generated yet.
    </ParticipantStateSection>
  );
}

function ContributionRow({
  submission,
  assignment,
  feedback,
  recat,
  replies,
  expanded,
  onToggle,
}: {
  submission: Submission;
  assignment?: Assignment;
  feedback?: FeedbackSummary;
  recat?: RecatRequest;
  replies?: ArchiveThreadMessage[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const snippet =
    submission.body.length > 120 ? submission.body.slice(0, 120) + "..." : submission.body;

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
              <Badge tone={categoryColorToTone(assignment.categoryColor, 0)}>
                {assignment.categoryName}
              </Badge>
            ) : null}
            {replies && replies.length > 0 ? (
              <Badge tone="neutral">
                {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </Badge>
            ) : null}
            {feedbackBadge ? (
              <Badge tone={feedbackBadge as "sky" | "error" | "neutral"}>
                {feedback?.status === "success"
                  ? "Feedback ready"
                  : feedback?.status === "error"
                    ? "Feedback failed"
                    : "Pending"}
              </Badge>
            ) : null}
            {recat ? <Badge tone="mustard">Recat {recat.status}</Badge> : null}
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
                <Badge
                  tone={
                    feedback.status === "success"
                      ? "sky"
                      : feedback.status === "error"
                        ? "error"
                        : "neutral"
                  }
                >
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

          {replies && replies.length > 0 ? (
            <div className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-canvas)] p-3">
              <p className="font-display text-xs font-medium text-[var(--c-ink)]">Replies</p>
              <div className="mt-2 flex flex-col gap-2">
                {replies.map((reply) => (
                  <div
                    key={reply.submission.id}
                    className="rounded-sm border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-2"
                  >
                    <p className="text-[10px] text-[var(--c-muted)]">
                      {reply.submission.kind === "reply" ? "Reply" : "Follow-up"} -{" "}
                      {formatTime(reply.submission.createdAt)}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--c-body)]">
                      {reply.submission.body}
                    </p>
                  </div>
                ))}
              </div>
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
