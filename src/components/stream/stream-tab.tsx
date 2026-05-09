import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PresenceBar } from "@/components/stream/presence-bar";
import { ResponseStreamItem } from "@/components/stream/response-stream-item";
import { categoryColorToTone } from "@/lib/category-colors";
import { MOCK_CATEGORIES, MOCK_STREAM_RESPONSES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface PeerResponse {
  id: string;
  nickname: string;
  body: string;
  inputPattern: string;
  createdAt: number;
}

interface CategorySummary {
  id: string;
  name: string;
  color?: string | null;
  assignmentCount: number;
}

interface StreamTabProps {
  peerResponses?: PeerResponse[];
  categories?: CategorySummary[];
  canSeeRawPeerResponses?: boolean;
  canSeeCategorySummary?: boolean;
  presenceTyping?: number;
  presenceSubmitted?: number;
  presenceIdle?: number;
}

export function StreamTab({
  peerResponses,
  categories,
  canSeeRawPeerResponses = true,
  canSeeCategorySummary = true,
  presenceTyping = 6,
  presenceSubmitted = 24,
  presenceIdle = 4,
}: StreamTabProps) {
  const [filter, setFilter] = useState<string | null>(null);

  const cats = categories ?? MOCK_CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    assignmentCount: c.count,
  }));

  const responses = peerResponses ?? MOCK_STREAM_RESPONSES.map((r) => ({
    id: r.id,
    nickname: r.nickname,
    body: r.text,
    inputPattern: r.telemetry.pasteEvents > 0 ? "likely_pasted" : "composed_gradually",
    createdAt: Date.now(),
  }));

  const filtered = filter
    ? responses
    : responses;

  return (
    <div className="space-y-3">
      <PresenceBar typing={presenceTyping} submitted={presenceSubmitted} idle={presenceIdle} />

      {canSeeCategorySummary && cats.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilter(null)}
            className={cn(
              "shrink-0 rounded-pill px-2.5 py-1 text-[10px] font-medium transition-colors",
              !filter
                ? "bg-[var(--c-primary)] text-[var(--c-on-primary)]"
                : "bg-[var(--c-surface-strong)] text-[var(--c-muted)]",
            )}
          >
            All
          </button>
          {cats.map((cat, i) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilter(filter === cat.id ? null : cat.id)}
              className="shrink-0"
            >
              <Badge
                tone={categoryColorToTone(cat.color, i)}
                className={cn(
                  "cursor-pointer transition-opacity",
                  filter && filter !== cat.id && "opacity-40",
                )}
              >
                {cat.name.split(" ")[0]}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {!canSeeRawPeerResponses ? (
        <div className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-4 text-center">
          <p className="text-sm text-[var(--c-muted)]">
            {responses.length} responses collected. Peer responses remain private until the instructor releases them.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-[var(--c-muted)]">No responses yet.</p>
          )}
          {filtered.map((r) => (
            <ResponseStreamItem
              key={r.id}
              nickname={r.nickname}
              text={r.body}
              categoryColor="neutral"
              originality={r.inputPattern === "likely_pasted" ? "med" : "high"}
              telemetryLabel={r.inputPattern === "likely_pasted" ? "Likely pasted" : "Composed gradually"}
              telemetryWarning={r.inputPattern === "likely_pasted"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
