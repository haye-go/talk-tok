export interface LiveCountersRailCardProps {
  typing: number;
  submitted: number;
  uncategorized: number;
  pendingRecategorisation: number;
}

export function LiveCountersRailCard({
  typing,
  submitted,
  uncategorized,
  pendingRecategorisation,
}: LiveCountersRailCardProps) {
  const rows: Array<[string, number, boolean]> = [
    ["Typing now", typing, false],
    ["Submitted", submitted, false],
    ["Uncategorized", uncategorized, uncategorized > 0],
    ["Pending recat", pendingRecategorisation, pendingRecategorisation > 0],
  ];

  return (
    <section className="rounded-2xl border border-[#dbe5ef] bg-white/75 p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">
        Live Counters
      </p>
      <div className="grid grid-cols-2 gap-3">
        {rows.map(([label, value, warn]) => (
          <div key={label} className="border-t border-[#d7e0ea] py-2">
            <strong
              className={`block font-display text-xl ${
                warn ? "text-[var(--c-warning)]" : "text-[var(--c-ink)]"
              }`}
            >
              {value}
            </strong>
            <span className="text-[10px] text-[var(--c-muted)]">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
