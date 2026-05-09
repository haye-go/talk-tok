import { Swords, Timer } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { MOCK_SUBMISSION } from "@/lib/mock-data";

export function MyZoneTab() {
  const sub = MOCK_SUBMISSION;
  const durationSec = Math.round(sub.telemetry.durationMs / 1000);
  const durationLabel =
    durationSec >= 60
      ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
      : `${durationSec}s`;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="-mx-4 -mt-4 bg-[var(--c-sig-peach)] px-4 py-4">
        <h2 className="font-display text-lg font-medium text-[var(--c-on-sig-light)]">My Zone</h2>
        <p className="text-xs text-[var(--c-on-sig-light-body)]" style={{ opacity: 0.7 }}>
          Your responses and analysis
        </p>
      </div>

      {/* Main response */}
      <div
        className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
        style={{ borderLeft: "3px solid var(--c-sig-sky)" }}
      >
        <p className="text-xs leading-relaxed text-[var(--c-body)]">
          &ldquo;{sub.text}&rdquo;
        </p>
        <div className="mt-2 flex items-center justify-between">
          <Badge tone={sub.categoryColor}>{sub.categoryName}</Badge>
          <span className="text-[10px] text-[var(--c-muted)]">2m ago</span>
        </div>
        <div className="mt-1.5 flex gap-1.5">
          <span className="rounded bg-[var(--c-surface-strong)] px-1.5 py-0.5 text-[10px] text-[var(--c-sig-mustard)]">
            Originality: ████░░
          </span>
          <span className="rounded bg-[var(--c-surface-strong)] px-1.5 py-0.5 text-[10px] text-[var(--c-success)]">
            <Timer size={10} className="mr-0.5 inline" />
            {durationLabel}
          </span>
        </div>
      </div>

      {/* Follow-up */}
      <div className="ml-4 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3" style={{ borderLeft: "2px solid var(--c-muted)" }}>
        <p className="mb-0.5 text-[10px] text-[var(--c-muted)]">Follow-up</p>
        <p className="text-xs leading-relaxed text-[var(--c-body)]">
          &ldquo;To add: the insurance industry hasn&rsquo;t priced AI diagnostic risk yet...&rdquo;
        </p>
      </div>

      {/* Fight Me record */}
      <div
        className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
        style={{ borderLeft: "3px solid var(--c-sig-coral)" }}
      >
        <div className="flex items-center justify-between">
          <span className="font-display text-xs font-semibold text-[var(--c-sig-coral)]">
            <Swords size={12} className="mr-0.5 inline" /> Fight Me vs AI
          </span>
          <span className="text-[10px] text-[var(--c-muted)]">Completed</span>
        </div>
        <p className="mt-1 text-[10px] text-[var(--c-muted)]">Topic: Liability gap · 3 rounds</p>
        <p className="mt-0.5 text-[10px]">
          <a href="#" className="text-[var(--c-link)] underline">
            View debrief
          </a>
        </p>
      </div>

      {/* Recat request */}
      <div
        className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
        style={{ borderLeft: "3px solid var(--c-sig-yellow)" }}
      >
        <p className="font-display text-xs font-medium text-[var(--c-sig-mustard)]">
          Re-categorization request
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--c-muted)]">
          Suggested: Cost &amp; Access →{" "}
          <span className="text-[var(--c-success)]">Approved ✓</span>
        </p>
      </div>
    </div>
  );
}
