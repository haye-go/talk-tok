import type { Id } from "../../../../convex/_generated/dataModel";
import { QuestionManagerPanel } from "@/components/instructor/question-manager-panel";
import {
  type SessionControlSnapshot,
  type SessionSettingsUpdate,
  type VisibilityMode,
} from "@/components/instructor/session-controls-card";
import { AccessAndSharingSection } from "./access-and-sharing-section";
import { AiReadinessSection, type AiReadinessSectionProps } from "./ai-readiness-section";
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

export interface SetupWorkspaceProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
  session: SessionControlSnapshot & { joinCode: string };
  currentQuestion: CurrentQuestionInfo | null;
  metrics: {
    submitted: number;
    categories: number;
    recategorisationRequests: number;
    followUps: number;
  };
  onVisibilityChange: (visibilityMode: VisibilityMode) => Promise<void>;
  onSettingsSave: (settings: SessionSettingsUpdate) => Promise<void>;
  joinUrl: string;
  categories: CategoryItem[];
  followUps: FollowUpPrompt[];
  aiReadiness: Omit<AiReadinessSectionProps, "sessionSlug" | "selectedQuestionId">;
}

export function SetupWorkspace({
  sessionSlug,
  selectedQuestionId,
  session,
  currentQuestion,
  metrics,
  onVisibilityChange,
  onSettingsSave,
  joinUrl,
  categories,
  followUps,
  aiReadiness,
}: SetupWorkspaceProps) {
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
        onVisibilityChange={onVisibilityChange}
        onSettingsSave={onSettingsSave}
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
        {...aiReadiness}
      />
    </div>
  );
}
