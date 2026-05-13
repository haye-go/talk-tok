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
  const [textCollapsed, setTextCollapsed] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const questions = releasedQuestions ?? [];
  const hasMultipleQuestions = questions.length > 1 && onSelectQuestion;
  const TextCaret = textCollapsed ? CaretDown : CaretUp;

  return (
    <div className="mx-4 my-2 rounded-xl border border-[var(--c-question-surface-strong)]/30 bg-[var(--c-question-surface)] px-4 py-2.5 shadow-md">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-[10px] font-medium uppercase tracking-wider text-[var(--c-muted)]">
          {promptLabel}
        </p>

        {hasMultipleQuestions ? (
          <button
            type="button"
            onClick={() => setSwitcherOpen((v) => !v)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-pill border px-2 py-0.5 text-[10px] font-medium transition-colors",
              switcherOpen
                ? "border-[var(--c-question-surface-strong)] bg-[var(--c-question-surface-strong)]/20 text-[var(--c-question-ink)]"
                : "border-[var(--c-question-surface-strong)]/40 text-[var(--c-muted)] hover:border-[var(--c-question-surface-strong)] hover:text-[var(--c-question-ink)]",
            )}
          >
            Switch
            {switcherOpen ? <CaretUp size={10} /> : <CaretDown size={10} />}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setTextCollapsed((v) => !v)}
          className="shrink-0 rounded-md p-1 text-[var(--c-question-ink)] hover:bg-[var(--c-question-surface-strong)]/20"
        >
          <TextCaret size={14} />
        </button>
      </div>

      <p
        className={cn(
          "mt-0.5 text-xs font-semibold leading-snug text-[var(--c-question-ink)]",
          textCollapsed && "line-clamp-1",
        )}
      >
        &ldquo;{prompt}&rdquo;
      </p>

      {switcherOpen && hasMultipleQuestions ? (
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
