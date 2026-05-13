import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";

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
    <Card title="Novelty Radar">
      <p className="mb-3 text-xs leading-5 text-[var(--c-muted)]">
        Highlights novel signals across categories relative to baseline.
      </p>
      <div className="mb-4 grid grid-cols-3 gap-2 md:max-w-sm">
        <MetricTile label="Low" value={String(radar.distribution.low)} />
        <MetricTile label="Medium" value={String(radar.distribution.medium)} />
        <MetricTile label="High" value={String(radar.distribution.high)} />
      </div>
      <div className="grid gap-2">
        {radar.topDistinctive.slice(0, 5).map((item) => (
          <div key={item.signalId} className="rounded-sm bg-[var(--c-surface-strong)] p-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--c-ink)]">{item.participantLabel}</span>
              <Badge tone="mustard">{item.band}</Badge>
            </div>
            {item.bodyPreview ? (
              <p className="mt-1 text-xs text-[var(--c-body)]">
                {previewText(item.bodyPreview)}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
