import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type VisibilityPatch = {
  peerResponsesVisible?: boolean;
  categoryBoardVisible?: boolean;
  synthesisVisible?: boolean;
  personalReportsVisible?: boolean;
  fightEnabled?: boolean;
  repliesEnabled?: boolean;
  upvotesEnabled?: boolean;
};

export interface ReleaseInteractionRailCardProps {
  sessionSlug: string;
  selectedQuestion:
    | {
        id: Id<"sessionQuestions">;
        peerResponsesVisible: boolean | undefined;
        categoryBoardVisible: boolean | undefined;
        synthesisVisible: boolean | undefined;
        personalReportsVisible: boolean | undefined;
        fightEnabled: boolean | undefined;
        repliesEnabled: boolean | undefined;
        upvotesEnabled: boolean | undefined;
        contributionsOpen: boolean;
      }
    | null;
  summaryGateEnabled: boolean;
}

export function ReleaseInteractionRailCard({
  sessionSlug,
  selectedQuestion,
  summaryGateEnabled,
}: ReleaseInteractionRailCardProps) {
  const updateQuestionVisibility = useMutation(api.sessionQuestions.updateVisibility);
  const setContributionState = useMutation(api.sessionQuestions.setContributionState);
  const updateSessionSettings = useMutation(api.instructorControls.updateSettings);

  const disabled = !selectedQuestion;

  function patchQuestion(patch: VisibilityPatch) {
    if (!selectedQuestion) return;
    void updateQuestionVisibility({ questionId: selectedQuestion.id, visibility: patch });
  }

  const rows: Array<{
    key: string;
    label: string;
    on: boolean;
    onLabel: string;
    offLabel: string;
    onClick: () => void;
  }> = [
    {
      key: "contributions",
      label: "Contributions",
      on: selectedQuestion?.contributionsOpen ?? false,
      onLabel: "Open",
      offLabel: "Closed",
      onClick: () => {
        if (!selectedQuestion) return;
        void setContributionState({
          questionId: selectedQuestion.id,
          contributionsOpen: !selectedQuestion.contributionsOpen,
        });
      },
    },
    {
      key: "peer",
      label: "Peer responses",
      on: selectedQuestion?.peerResponsesVisible ?? false,
      onLabel: "Visible",
      offLabel: "Hidden",
      onClick: () => patchQuestion({ peerResponsesVisible: !selectedQuestion?.peerResponsesVisible }),
    },
    {
      key: "board",
      label: "Category board",
      on: selectedQuestion?.categoryBoardVisible ?? false,
      onLabel: "Visible",
      offLabel: "Hidden",
      onClick: () => patchQuestion({ categoryBoardVisible: !selectedQuestion?.categoryBoardVisible }),
    },
    {
      key: "synthesis",
      label: "Synthesis",
      on: selectedQuestion?.synthesisVisible ?? false,
      onLabel: "Visible",
      offLabel: "Hidden",
      onClick: () => patchQuestion({ synthesisVisible: !selectedQuestion?.synthesisVisible }),
    },
    {
      key: "reports",
      label: "Reports",
      on: selectedQuestion?.personalReportsVisible ?? false,
      onLabel: "Visible",
      offLabel: "Hidden",
      onClick: () =>
        patchQuestion({ personalReportsVisible: !selectedQuestion?.personalReportsVisible }),
    },
    {
      key: "gate",
      label: "Reports gate",
      on: summaryGateEnabled,
      onLabel: "On",
      offLabel: "Off",
      onClick: () => {
        void updateSessionSettings({
          sessionSlug,
          summaryGateEnabled: !summaryGateEnabled,
        });
      },
    },
    {
      key: "replies",
      label: "Replies",
      on: selectedQuestion?.repliesEnabled ?? false,
      onLabel: "On",
      offLabel: "Off",
      onClick: () => patchQuestion({ repliesEnabled: !selectedQuestion?.repliesEnabled }),
    },
    {
      key: "upvotes",
      label: "Upvotes",
      on: selectedQuestion?.upvotesEnabled ?? false,
      onLabel: "On",
      offLabel: "Off",
      onClick: () => patchQuestion({ upvotesEnabled: !selectedQuestion?.upvotesEnabled }),
    },
    {
      key: "fight",
      label: "Fight",
      on: selectedQuestion?.fightEnabled ?? false,
      onLabel: "On",
      offLabel: "Off",
      onClick: () => patchQuestion({ fightEnabled: !selectedQuestion?.fightEnabled }),
    },
  ];

  return (
    <section className="rounded-2xl border border-[#dbe5ef] bg-white/75 p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">
        Release + Interaction
      </p>
      <div className="grid gap-2.5">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-3 border-b border-[#e5edf4] pb-2 last:border-b-0 last:pb-0"
          >
            <span className="text-sm text-[var(--c-ink)]">{row.label}</span>
            <button
              type="button"
              disabled={row.key !== "gate" && disabled}
              onClick={row.onClick}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-bold transition",
                row.on
                  ? "bg-[#dff6f0] text-[#0f766e] hover:bg-[#cdebd9]"
                  : "bg-[#edf2f7] text-[var(--c-muted)] hover:bg-[#dfe6ed]",
                row.key !== "gate" && disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              )}
            >
              {row.on ? row.onLabel : row.offLabel}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
