import { ChartBar } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_CATEGORIES } from "@/lib/mock-data";

export function SynthesizeAct() {
  const categories = MOCK_CATEGORIES.filter((c) => c.color !== "neutral");

  return (
    <div className="space-y-3">
      <h2 className="font-display text-base font-medium text-[var(--c-ink)]">Class Synthesis</h2>

      {categories.map((cat) => (
        <div
          key={cat.id}
          className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
          style={{ borderLeft: `3px solid var(--c-sig-${cat.color})` }}
        >
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-medium text-[var(--c-ink)]">{cat.name}</span>
            <Badge tone={cat.color} className="text-[9px]">
              {cat.count}
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--c-muted)]">{cat.summary}</p>
          <p className="mt-1.5 text-[10px]">
            <a href="#" className="text-[var(--c-link)] underline">
              View quotes
            </a>
            {cat.count > 5 && (
              <>
                {" · "}
                <a href="#" className="text-[var(--c-link)] underline">
                  {Math.max(1, Math.floor(cat.count / 3))} unique insights
                </a>
              </>
            )}
          </p>
        </div>
      ))}

      {/* Personal report CTA */}
      <div
        className="rounded-md border bg-[var(--c-surface-soft)] p-4 text-center"
        style={{ borderColor: "var(--c-success)" }}
      >
        <p className="font-display text-sm font-medium text-[var(--c-success)]">
          <ChartBar size={16} className="mr-1 inline" />
          Your Personal Analysis
        </p>
        <p className="mt-1 text-xs text-[var(--c-muted)]">
          See how your contributions shaped the discussion
        </p>
        <Button className="mt-3" style={{ background: "var(--c-success)", color: "white" }}>
          Generate My Report
        </Button>
      </div>
    </div>
  );
}
