import { useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ReleasedQuestion {
  id: string;
  title: string;
  isCurrent: boolean;
}

interface ParticipantQuestionBarProps {
  prompt: string;
  promptLabel: string;
  releasedQuestions?: ReleasedQuestion[];
  selectedQuestionId?: string | null;
  onSelectQuestion?: (questionId: string | null) => void;
}

export function ParticipantQuestionBar({
  prompt,
  promptLabel,
  releasedQuestions,
  selectedQuestionId,
  onSelectQuestion,
}: ParticipantQuestionBarProps) {
  const [expanded, setExpanded] = useState(false);
  const questions = releasedQuestions ?? [];
  const hasMultipleQuestions = questions.length > 1 && onSelectQuestion;
  const Caret = expanded ? CaretUp : CaretDown;

  return (
    <div className="border-b border-[var(--c-question-surface-strong)]/35 bg-[var(--c-question-surface)] px-4 py-2 shadow-[0_8px_22px_color-mix(in_oklch,var(--c-question-surface-strong),transparent_86%)]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-2 rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-info-border)]"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--c-muted)]">
            {promptLabel}
          </p>
          <p
            className={cn(
              "mt-0.5 text-xs font-semibold leading-snug text-[var(--c-question-ink)]",
              !expanded && "line-clamp-1",
            )}
          >
            &ldquo;{prompt}&rdquo;
          </p>
        </div>
        <Caret size={14} className="mt-1 shrink-0 text-[var(--c-question-ink)]" />
      </button>

      {expanded && hasMultipleQuestions ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {questions.map((question) => {
            const active = selectedQuestionId === question.id;
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => onSelectQuestion(question.isCurrent ? null : question.id)}
                className={cn(
                  "rounded-pill border px-2.5 py-1 text-[10px] font-medium transition-colors",
                  active
                    ? "border-[var(--c-primary)] bg-[var(--c-primary)] text-[var(--c-on-primary)]"
                    : "border-[var(--c-hairline)] bg-[var(--c-canvas)] text-[var(--c-ink)]",
                )}
              >
                {question.title}
                {question.isCurrent ? " (current)" : ""}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
