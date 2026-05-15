import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  SessionControlsCard,
  type SessionControlSnapshot,
  type SessionSettingsUpdate,
  type VisibilityMode,
} from "@/components/instructor/session-controls-card";

function getSessionControlsKey(session: SessionControlSnapshot) {
  return [
    session.title,
    session.openingPrompt,
    session.phase,
    session.visibilityMode,
    session.anonymityMode,
    session.responseSoftLimitWords,
    session.categorySoftCap,
    session.critiqueToneDefault,
    session.telemetryEnabled,
    session.fightMeEnabled,
    session.summaryGateEnabled,
  ].join("|");
}

interface QuestionManagerPanelProps {
  session: SessionControlSnapshot & { joinCode: string };
  currentQuestion?: {
    id: Id<"sessionQuestions">;
    title: string;
    prompt: string;
    status: string;
    isCurrent: boolean;
  } | null;
  metrics: {
    submitted: number;
    categories: number;
    recategorisationRequests: number;
    followUps: number;
  };
  onVisibilityChange: (visibilityMode: VisibilityMode) => Promise<void>;
  onSettingsSave: (settings: SessionSettingsUpdate) => Promise<void>;
  onQuestionSave: (
    questionId: Id<"sessionQuestions">,
    patch: { title: string; prompt: string },
  ) => Promise<void>;
}

export function QuestionManagerPanel({
  session,
  currentQuestion,
  metrics,
  onVisibilityChange,
  onSettingsSave,
  onQuestionSave,
}: QuestionManagerPanelProps) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftPrompt, setDraftPrompt] = useState("");
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const trimmedTitle = draftTitle.trim();
  const trimmedPrompt = draftPrompt.trim();
  const canSaveQuestion =
    Boolean(currentQuestion) &&
    trimmedTitle.length >= 3 &&
    trimmedPrompt.length >= 10 &&
    !savingQuestion;

  function startEditingQuestion() {
    setDraftTitle(currentQuestion?.title ?? "Current Question");
    setDraftPrompt(currentQuestion?.prompt ?? session.openingPrompt);
    setQuestionError(null);
    setEditing(true);
  }

  async function handleQuestionSave() {
    if (!currentQuestion) return;

    setSavingQuestion(true);
    setQuestionError(null);
    try {
      await onQuestionSave(currentQuestion.id, {
        title: trimmedTitle,
        prompt: trimmedPrompt,
      });
      setEditing(false);
    } catch (cause) {
      setQuestionError(cause instanceof Error ? cause.message : "Could not update question.");
    } finally {
      setSavingQuestion(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Card
        title={editing ? "Edit question" : (currentQuestion?.title ?? "Current Question")}
        eyebrow={session.joinCode}
        action={
          currentQuestion && !editing ? (
            <Button type="button" size="sm" variant="secondary" onClick={startEditingQuestion}>
              Edit question
            </Button>
          ) : null
        }
      >
        {editing ? (
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleQuestionSave();
            }}
          >
            <div>
              <label
                htmlFor="question-title"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]"
              >
                Question title
              </label>
              <input
                id="question-title"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                aria-invalid={Boolean(questionError)}
                className="mt-1 min-h-11 w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm text-[var(--c-ink)] outline-none transition focus:border-[var(--c-primary)]"
                autoFocus
              />
            </div>
            <div>
              <label
                htmlFor="question-prompt"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]"
              >
                Prompt shown to participants
              </label>
              <textarea
                id="question-prompt"
                value={draftPrompt}
                onChange={(event) => setDraftPrompt(event.target.value)}
                aria-invalid={Boolean(questionError)}
                rows={5}
                className="mt-1 w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm leading-6 text-[var(--c-ink)] outline-none transition focus:border-[var(--c-primary)]"
              />
            </div>
            {questionError ? (
              <p className="text-xs text-[var(--c-error)]" role="alert">
                {questionError}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[var(--c-muted)]">
                Saving updates the live question text and the AI categorisation context.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setQuestionError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!canSaveQuestion}>
                  {savingQuestion ? "Saving..." : "Save question"}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <>
            <p className="text-sm leading-6 text-[var(--c-body)]">
              {currentQuestion?.prompt ?? session.openingPrompt}
            </p>
            <p className="mt-2 text-[11px] text-[var(--c-muted)]">
              AI controls target this question unless a panel explicitly says otherwise.
            </p>
          </>
        )}
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-[var(--c-hairline)] pt-3 text-xs">
          <span>
            <strong className="text-[var(--c-ink)]">{metrics.submitted}</strong>{" "}
            <span className="text-[var(--c-muted)]">submitted</span>
          </span>
          <span aria-hidden className="text-[var(--c-muted)]">
            /
          </span>
          <span>
            <strong className="text-[var(--c-ink)]">{metrics.categories}</strong>{" "}
            <span className="text-[var(--c-muted)]">categories</span>
          </span>
          <span aria-hidden className="text-[var(--c-muted)]">
            /
          </span>
          <span>
            <strong className="text-[var(--c-ink)]">{metrics.recategorisationRequests}</strong>{" "}
            <span className="text-[var(--c-muted)]">recat pending</span>
          </span>
          <span aria-hidden className="text-[var(--c-muted)]">
            /
          </span>
          <span>
            <strong className="text-[var(--c-ink)]">{metrics.followUps}</strong>{" "}
            <span className="text-[var(--c-muted)]">follow-ups</span>
          </span>
        </div>
      </Card>

      <SessionControlsCard
        key={getSessionControlsKey(session)}
        session={session}
        onVisibilityChange={onVisibilityChange}
        onSettingsSave={onSettingsSave}
      />
    </div>
  );
}
