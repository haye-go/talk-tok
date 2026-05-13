import { Card } from "@/components/ui/card";

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
    <Card title="Category Drift">
      <p className="mb-3 text-xs leading-5 text-[var(--c-muted)]">
        How category distribution has changed over time. Each bar shows the share of threads per
        category across {drift.slices.length} slice{drift.slices.length === 1 ? "" : "s"}.
      </p>

      {grandTotal > 0 ? (
        <div className="mb-5 grid gap-3">
          {Array.from(totalsByCategory.entries()).map(([id, entry]) => {
            const share = entry.total / grandTotal;
            const percent = Math.round(share * 100);
            return (
              <div key={id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--c-ink)]">{entry.name}</span>
                  <span className="text-[var(--c-muted)]">
                    {entry.total} threads · {percent}%
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

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[var(--c-hairline)] text-left text-[var(--c-muted)]">
              <th className="py-1 pr-2 font-medium">Slice</th>
              {drift.slices[0].categoryCounts.map((cell) => (
                <th key={cell.categoryId} className="py-1 pr-2 font-medium">
                  {cell.categoryName?.split(" ")[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drift.slices.map((slice) => (
              <tr key={slice.key} className="border-b border-[var(--c-hairline)]">
                <td className="py-1 pr-2 text-[var(--c-ink)]">{slice.label}</td>
                {slice.categoryCounts.map((cell) => (
                  <td key={cell.categoryId} className="py-1 pr-2 font-mono text-[var(--c-body)]">
                    {cell.count}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
