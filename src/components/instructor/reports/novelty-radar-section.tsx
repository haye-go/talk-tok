import { Badge } from "@/components/ui/badge";

interface NoveltyRadarItem {
  signalId: string;
  participantLabel: string;
  band: string;
  bodyPreview?: string;
}

export interface NoveltyRadarSectionProps {
  radar: {
    distribution: { low: number; medium: number; high: number };
    topDistinctive: NoveltyRadarItem[];
  } | null;
}

function previewText(value?: string | null, maxLength = 140) {
  const text = value?.trim();
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

export function NoveltyRadarSection({ radar }: NoveltyRadarSectionProps) {
  if (!radar) {
    return null;
  }

  return (
    <section>
      <header className="border-b border-[var(--c-hairline)] pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
          Novelty Radar
        </p>
        <p className="mt-1 text-xs text-[var(--c-muted)]">
          Highlights novel signals across categories relative to baseline.
        </p>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[var(--c-muted)]">Distribution:</span>
        <span className="rounded-pill bg-[var(--c-surface-strong)] px-2 py-0.5 font-semibold text-[var(--c-ink)]">
          Low {radar.distribution.low}
        </span>
        <span className="rounded-pill bg-[var(--c-sig-yellow)]/40 px-2 py-0.5 font-semibold text-[var(--c-ink)]">
          Medium {radar.distribution.medium}
        </span>
        <span className="rounded-pill bg-[var(--c-sig-mustard)]/40 px-2 py-0.5 font-semibold text-[var(--c-ink)]">
          High {radar.distribution.high}
        </span>
      </div>

      <div className="mt-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--c-muted)]">
          Top Distinctive
        </p>
        <ul className="grid gap-0 border-t border-[var(--c-hairline)]">
          {radar.topDistinctive.slice(0, 5).map((item) => (
            <li
              key={item.signalId}
              className="grid gap-1 border-b border-[var(--c-hairline)] py-2 text-xs last:border-b-0"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-[var(--c-ink)]">{item.participantLabel}</span>
                <Badge tone="mustard">{item.band}</Badge>
              </div>
              {item.bodyPreview ? (
                <p className="text-[var(--c-muted)]">{previewText(item.bodyPreview)}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
