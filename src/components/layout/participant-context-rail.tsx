import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface ReleasedQuestion {
  id: string;
  title: string;
  isCurrent: boolean;
}

interface ParticipantContextRailProps {
  prompt: string;
  promptLabel: string;
  releasedQuestions?: ReleasedQuestion[];
  selectedQuestionId?: string | null;
  onSelectQuestion?: (questionId: string | null) => void;
  children?: ReactNode;
}

export function ParticipantContextRail({
  prompt,
  promptLabel,
  releasedQuestions,
  selectedQuestionId,
  onSelectQuestion,
  children,
}: ParticipantContextRailProps) {
  const questions = releasedQuestions ?? [];

  return (
    <aside className="hidden w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-4 lg:flex">
      <Card tone="cream">
        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--c-on-sig-light-body)]">
          {promptLabel}
        </p>
        <p className="mt-1 text-sm font-medium leading-relaxed text-[var(--c-on-sig-light)]">
          &ldquo;{prompt}&rdquo;
        </p>
      </Card>

      {questions.length > 1 && onSelectQuestion ? (
        <div>
          <p className="mb-1.5 font-display text-[11px] font-medium text-[var(--c-muted)]">
            Questions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((question) => {
              const active = selectedQuestionId === question.id;
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() =>
                    onSelectQuestion(question.isCurrent ? null : question.id)
                  }
                  className={`rounded-pill border px-2.5 py-1 text-[11px] transition ${
                    active
                      ? "border-[var(--c-primary)] bg-[var(--c-primary)] text-[var(--c-on-primary)]"
                      : "border-[var(--c-hairline)] bg-[var(--c-canvas)] text-[var(--c-ink)] hover:bg-[var(--c-surface-strong)]"
                  }`}
                >
                  {question.title}
                  {question.isCurrent ? " (current)" : ""}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {children}
    </aside>
  );
}
