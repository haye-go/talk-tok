import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../convex/_generated/dataModel";

interface QuestionItem {
  id: Id<"sessionQuestions">;
  title: string;
  status: string;
}

export interface SelectedQuestionRailCardProps {
  selectedQuestion: { id: Id<"sessionQuestions">; title: string } | null;
  questions: ReadonlyArray<QuestionItem>;
  questionHref: (questionId: Id<"sessionQuestions">) => string;
}

export function SelectedQuestionRailCard({
  selectedQuestion,
  questions,
  questionHref,
}: SelectedQuestionRailCardProps) {
  return (
    <>
      <section className="rounded-2xl border border-[#dbe5ef] bg-white/75 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">
          Selected Question
        </p>
        <p className="mt-2 font-display text-sm font-semibold leading-5 text-[var(--c-ink)]">
          {selectedQuestion?.title ?? "No question selected"}
        </p>
        <p className="mt-2 text-xs leading-5 text-[var(--c-muted)]">
          Question switcher — tap to change the active question.
        </p>
      </section>

      <section className="border-b border-[#d7e0ea] pb-5">
        <p className="mb-2 text-xs font-semibold text-[var(--c-ink)]">Question switcher</p>
        <div className="grid gap-2">
          {questions.map((question) => (
            <Link
              key={question.id}
              to={questionHref(question.id)}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs transition",
                selectedQuestion?.id === question.id
                  ? "border-[#17212b] bg-white text-[var(--c-ink)]"
                  : "border-[#d7e0ea] text-[var(--c-muted)] hover:bg-white hover:text-[var(--c-ink)]",
              )}
            >
              <span className="block truncate font-medium">{question.title}</span>
              <span className="mt-0.5 block text-[10px]">{question.status}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
