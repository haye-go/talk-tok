import { useInstructorShell } from "@/hooks/use-instructor-shell";
import type { Id } from "../../../convex/_generated/dataModel";
import { LiveActivityRailSection } from "./right-rail/live-activity-rail-section";
import { LiveCountersRailCard } from "./right-rail/live-counters-rail-card";
import { PresenceRailCard } from "./right-rail/presence-rail-card";
import { QuickActionsRailCard } from "./right-rail/quick-actions-rail-card";
import { ReleaseInteractionRailCard } from "./right-rail/release-interaction-rail-card";
import { SelectedQuestionRailCard } from "./right-rail/selected-question-rail-card";

export interface InstructorRightRailProps {
  sessionSlug: string;
  selectedQuestionId?: Id<"sessionQuestions">;
  questionHref: (questionId: Id<"sessionQuestions">) => string;
}

export function InstructorRightRail({
  sessionSlug,
  selectedQuestionId,
  questionHref,
}: InstructorRightRailProps) {
  const shell = useInstructorShell(sessionSlug, selectedQuestionId);

  if (!shell) {
    return (
      <div className="flex min-h-full flex-col gap-5 p-5 text-[var(--c-body)]">
        <RailHeader />
        <section className="rounded-2xl border border-[#dbe5ef] bg-white/75 p-4">
          <p className="text-sm text-[var(--c-muted)]">Loading live rail…</p>
        </section>
      </div>
    );
  }

  const selectedQuestion = shell.selectedQuestion;

  return (
    <div className="flex min-h-full flex-col gap-5 p-5 text-[var(--c-body)]">
      <RailHeader />

      <SelectedQuestionRailCard
        selectedQuestion={
          selectedQuestion ? { id: selectedQuestion.id, title: selectedQuestion.title } : null
        }
        questions={shell.questions.map((question) => ({
          id: question.id,
          title: question.title,
          status: question.status,
        }))}
        questionHref={questionHref}
      />

      <ReleaseInteractionRailCard
        sessionSlug={sessionSlug}
        selectedQuestion={
          selectedQuestion
            ? {
                id: selectedQuestion.id,
                peerResponsesVisible: selectedQuestion.peerResponsesVisible,
                categoryBoardVisible: selectedQuestion.categoryBoardVisible,
                synthesisVisible: selectedQuestion.synthesisVisible,
                personalReportsVisible: selectedQuestion.personalReportsVisible,
                fightEnabled: selectedQuestion.fightEnabled,
                repliesEnabled: selectedQuestion.repliesEnabled,
                upvotesEnabled: selectedQuestion.upvotesEnabled,
                contributionsOpen: selectedQuestion.contributionsOpen,
              }
            : null
        }
        summaryGateEnabled={shell.visibility.summaryGateEnabled}
      />

      <PresenceRailCard
        connected={shell.counters.connected}
        active={shell.presence.aggregate.typing + shell.presence.aggregate.submitted}
        idle={shell.presence.aggregate.idle}
        samples={shell.presence.samples}
        total={shell.counters.total}
      />

      <LiveCountersRailCard
        typing={shell.counters.typing}
        submitted={shell.counters.submitted}
        uncategorized={shell.counters.uncategorized}
        pendingRecategorisation={shell.counters.pendingRecategorisation}
      />

      <QuickActionsRailCard
        sessionSlug={sessionSlug}
        selectedQuestionId={selectedQuestion?.id}
      />

      <LiveActivityRailSection activity={shell.activity} />
    </div>
  );
}

function RailHeader() {
  return (
    <section className="border-b border-[#d7e0ea] pb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">
        Persistent Live Rail
      </p>
      <h2 className="mt-2 font-display text-base font-semibold text-[var(--c-ink)]">
        Quick actions from any tab
      </h2>
      <p className="mt-2 text-xs leading-5 text-[var(--c-muted)]">
        Live controls stay reachable without forcing a workspace switch. Deep setup and review
        surfaces live in the center tabs.
      </p>
    </section>
  );
}
