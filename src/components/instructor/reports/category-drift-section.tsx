interface CategoryCountCell {
  categoryId: string;
  categoryName?: string;
  count: number;
}

interface CategoryDriftSlice {
  key: string;
  label: string;
  categoryCounts: CategoryCountCell[];
}

export interface CategoryDriftSectionProps {
  drift: {
    slices: CategoryDriftSlice[];
    transitions: ReadonlyArray<unknown>;
  } | null;
}

export function CategoryDriftSection({ drift }: CategoryDriftSectionProps) {
  if (!drift || drift.slices.length === 0) {
    return null;
  }

  const totalsByCategory = new Map<string, { name: string; total: number }>();
  for (const slice of drift.slices) {
    for (const cell of slice.categoryCounts) {
      const entry = totalsByCategory.get(cell.categoryId) ?? {
        name: cell.categoryName ?? "Unnamed",
        total: 0,
      };
      entry.total += cell.count;
      totalsByCategory.set(cell.categoryId, entry);
    }
  }
  const grandTotal = Array.from(totalsByCategory.values()).reduce(
    (sum, entry) => sum + entry.total,
    0,
  );

  return (
    <section>
      <header className="border-b border-[var(--c-hairline)] pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
          Category Drift · {drift.slices.length} slice{drift.slices.length === 1 ? "" : "s"}
        </p>
        <p className="mt-1 text-xs text-[var(--c-muted)]">
          Share of threads per category across the discussion. Bars total to 100%.
        </p>
      </header>

      {grandTotal > 0 ? (
        <div className="mt-4 grid gap-3">
          {Array.from(totalsByCategory.entries()).map(([id, entry]) => {
            const share = entry.total / grandTotal;
            const percent = Math.round(share * 100);
            return (
              <div key={id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--c-ink)]">{entry.name}</span>
                  <span className="text-[var(--c-muted)]">
                    {entry.total} thread{entry.total === 1 ? "" : "s"} · {percent}%
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-pill bg-[var(--c-surface-strong)]">
                  <div
                    className="h-full rounded-pill bg-[var(--c-sig-mustard)]/60"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
