import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { QuestionManagerPanel } from "@/components/instructor/question-manager-panel";
import {
  type SessionControlSnapshot,
  type SessionSettingsUpdate,
  type VisibilityMode,
} from "@/components/instructor/session-controls-card";
import { AccessAndSharingSection } from "./access-and-sharing-section";
import { AiReadinessSection } from "./ai-readiness-section";
import { CategoryTaxonomyEditor } from "./category-taxonomy-editor";
import { FollowUpDraftEditor } from "./follow-up-draft-editor";

interface CategoryItem {
  id: Id<"categories">;
  name: string;
  description?: string;
  color?: string;
  assignmentCount?: number;
}

interface FollowUpPrompt {
  id: Id<"followUpPrompts">;
  title: string;
  prompt: string;
  status: "draft" | "active" | "closed" | "archived";
  targetMode: string;
  activatedAt?: number;
  closedAt?: number;
  createdAt: number;
}

interface CurrentQuestionInfo {
  title: string;
  prompt: string;
  status: string;
  isCurrent: boolean;
}

interface SelectedQuestionStatus {
  status?: string;
}

export interface SetupWorkspaceProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
  session: SessionControlSnapshot & { joinCode: string; id: Id<"sessions"> };
  currentQuestion: CurrentQuestionInfo | null;
  selectedQuestion: SelectedQuestionStatus | null;
  metrics: {
    submitted: number;
    categories: number;
    recategorisationRequests: number;
    followUps: number;
  };
  joinUrl: string;
  categories: CategoryItem[];
  followUps: FollowUpPrompt[];
}

function isBusyStatus(status?: string) {
  return status === "queued" || status === "processing";
}

export function SetupWorkspace({
  sessionSlug,
  selectedQuestionId,
  session,
  currentQuestion,
  selectedQuestion,
  metrics,
  joinUrl,
  categories,
  followUps,
}: SetupWorkspaceProps) {
  const updateVisibility = useMutation(api.instructorControls.updateVisibility);
  const updateSettings = useMutation(api.instructorControls.updateSettings);
  const questionScopedArgs = selectedQuestionId
    ? { sessionSlug, questionId: selectedQuestionId }
    : { sessionSlug };
  const questionBaseline = useQuery(api.questionBaselines.getForQuestion, questionScopedArgs);
  const aiJobs = useQuery(api.jobs.listForSession, { ...questionScopedArgs, limit: 80 });

  const latestBaselineJob = aiJobs?.find((job) => job.type === "question_baseline") ?? null;
  const baselineBusy =
    isBusyStatus(latestBaselineJob?.status) || isBusyStatus(questionBaseline?.status);
  const baselineCanGenerate = selectedQuestion?.status === "released";
  const baselineSnapshot = questionBaseline
    ? {
        status: questionBaseline.status,
        provider: questionBaseline.provider ?? undefined,
        model: questionBaseline.model ?? undefined,
        generatedAt: questionBaseline.generatedAt ?? undefined,
      }
    : null;

  async function handleVisibilityChange(visibilityMode: VisibilityMode) {
    await updateVisibility({ sessionSlug, visibilityMode });
  }

  async function handleSettingsSave(settings: SessionSettingsUpdate) {
    await updateSettings({ sessionSlug, ...settings });
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 p-5 lg:p-7">
      <header className="border-b border-[#d7e0ea] pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">
          Setup / Prepare
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-[var(--c-ink)]">
          Prepare the session model
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--c-body)]">
          Setup owns question management, session configuration, category taxonomy, follow-up
          drafting, join access, templates, baselines, and AI readiness. Live discussion and review
          artifacts live elsewhere.
        </p>
      </header>

      <QuestionManagerPanel
        session={session}
        currentQuestion={currentQuestion}
        metrics={metrics}
        onVisibilityChange={handleVisibilityChange}
        onSettingsSave={handleSettingsSave}
      />

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-5">
          <CategoryTaxonomyEditor
            sessionSlug={sessionSlug}
            selectedQuestionId={selectedQuestionId}
            categories={categories}
          />
          <FollowUpDraftEditor
            sessionSlug={sessionSlug}
            selectedQuestionId={selectedQuestionId}
            categories={categories}
            followUps={followUps}
          />
        </div>
        <AccessAndSharingSection
          sessionSlug={sessionSlug}
          joinCode={session.joinCode}
          joinUrl={joinUrl}
        />
      </section>

      <AiReadinessSection
        sessionSlug={sessionSlug}
        selectedQuestionId={selectedQuestionId}
        sessionId={session.id}
        baseline={baselineSnapshot}
        baselineBusy={baselineBusy}
        baselineCanGenerate={baselineCanGenerate}
      />
    </div>
  );
}
