import { ArrowsClockwise, Lightning, Megaphone } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function ChallengeAct() {
  return (
    <div className="space-y-3">
      {/* Follow-up prompt from instructor */}
      <div className="rounded-md bg-[var(--c-sig-slate)] p-3.5 text-[var(--c-on-sig-dark)]">
        <p className="mb-1 text-[10px] font-display" style={{ opacity: 0.7 }}>
          <Megaphone size={12} className="mr-1 inline" />
          Follow-up from instructor
        </p>
        <p
          className="text-sm font-medium leading-relaxed"
          style={{ color: "var(--c-on-sig-dark)" }}
        >
          &ldquo;Those in Liability &amp; Law — how would you respond to the Patient Autonomy
          group&rsquo;s claim that informed consent solves the liability problem?&rdquo;
        </p>
      </div>

      {/* Fight Me CTA */}
      <div
        className="rounded-md bg-[var(--c-surface-soft)] p-4 text-center"
        style={{ border: "1px solid var(--c-sig-coral)" }}
      >
        <Lightning size={28} weight="fill" className="mx-auto mb-1 text-[var(--c-sig-coral)]" />
        <p className="font-display text-base font-medium text-[var(--c-sig-coral)]">
          Fight Me Mode
        </p>
        <p className="mt-1 text-xs text-[var(--c-muted)]">
          Challenge AI or an opposing view to a 1v1 debate
        </p>
        <div className="mt-3 flex gap-2">
          <Button variant="coral" className="flex-1">
            vs AI
          </Button>
          <Button variant="secondary" className="flex-1">
            vs Opposing View
          </Button>
        </div>
      </div>

      {/* Position shift */}
      <div className="flex items-center gap-3 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3">
        <ArrowsClockwise size={20} className="shrink-0 text-[var(--c-link)]" />
        <div>
          <p className="text-xs text-[var(--c-ink)]">Changed your mind?</p>
          <p className="text-[10px] text-[var(--c-muted)]">
            Flag a position shift and tell us what convinced you
          </p>
        </div>
      </div>
    </div>
  );
}
