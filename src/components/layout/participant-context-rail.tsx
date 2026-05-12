import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
      <section className="rounded-lg border border-[var(--c-question-surface-strong)]/35 bg-[var(--c-question-surface)] p-4 shadow-[0_12px_32px_color-mix(in_oklch,var(--c-question-surface-strong),transparent_88%)]">
        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--c-muted)]">
          {promptLabel}
        </p>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--c-question-ink)]">
          &ldquo;{prompt}&rdquo;
        </p>
      </section>

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
                  onClick={() => onSelectQuestion(question.isCurrent ? null : question.id)}
                  className={cn(
                    "rounded-pill border px-2.5 py-1 text-[11px] transition",
                    active
                      ? "border-[var(--c-primary)] bg-[var(--c-primary)] text-[var(--c-on-primary)]"
                      : "border-[var(--c-hairline)] bg-[var(--c-canvas)] text-[var(--c-ink)] hover:bg-[var(--c-surface-strong)]",
                  )}
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
