import { GearSix } from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { routes } from "@/lib/routes";

export function InstructorBrandBar() {
  return (
    <div className="flex items-center justify-between border-b border-[var(--c-hairline)] bg-[var(--c-canvas)] px-6 py-4">
      <a href={routes.instructor()} className="flex items-center gap-3 no-underline">
        <img src="/favicon.svg" alt="" className="h-10 w-10" />
        <span className="font-display text-2xl font-semibold text-[var(--c-ink)]">TalkTok</span>
      </a>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-sm text-[var(--c-muted)] transition-colors hover:bg-[var(--c-surface-soft)] hover:text-[var(--c-ink)]"
          onClick={() => (window.location.href = routes.instructorAdminModels())}
          aria-label="LLM model settings"
        >
          <GearSix size={18} />
        </button>
        <ThemeToggle />
      </div>
    </div>
  );
}
