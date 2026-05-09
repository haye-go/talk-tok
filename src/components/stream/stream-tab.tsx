import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { PresenceBar } from "@/components/stream/presence-bar";
import { ResponseStreamItem } from "@/components/stream/response-stream-item";
import { MOCK_CATEGORIES, MOCK_STREAM_RESPONSES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function StreamTab() {
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter
    ? MOCK_STREAM_RESPONSES.filter((r) => r.categoryColor === filter)
    : MOCK_STREAM_RESPONSES;

  const categoryFilters: { label: string; color: NonNullable<BadgeProps["tone"]> }[] =
    MOCK_CATEGORIES.filter((c) => c.color !== "neutral").map((c) => ({
      label: c.name.split(" ")[0],
      color: c.color,
    }));

  return (
    <div className="space-y-3">
      <PresenceBar typing={6} submitted={24} idle={4} />

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
        {categoryFilters.map((cf) => (
          <button
            key={cf.color}
            type="button"
            onClick={() => setFilter(filter === cf.color ? null : cf.color)}
            className="shrink-0"
          >
            <Badge
              tone={cf.color}
              className={cn(
                "cursor-pointer transition-opacity",
                filter && filter !== cf.color && "opacity-40",
              )}
            >
              {cf.label}
            </Badge>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((r) => (
          <ResponseStreamItem
            key={r.id}
            nickname={r.nickname}
            text={r.text}
            categoryColor={r.categoryColor}
            originality={r.originality}
            telemetryLabel={r.telemetry.label}
            telemetryWarning={r.telemetry.pasteEvents > 0}
            isOwn={r.nickname === "You"}
          />
        ))}
      </div>
    </div>
  );
}
