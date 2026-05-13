import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { categoryColorToTone } from "@/lib/category-colors";
import { ThreadCard, type ThreadCardData } from "./thread-card";

interface CategoryGroup {
  category: {
    id: Id<"categories">;
    name: string;
    description?: string;
    color?: string;
  };
  threads: ThreadCardData[];
}

export interface RoomCategoriesBoardProps {
  categoryGroups: CategoryGroup[];
  uncategorizedThreads: ThreadCardData[];
}

export function RoomCategoriesBoard({
  categoryGroups,
  uncategorizedThreads,
}: RoomCategoriesBoardProps) {
  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-medium text-[var(--c-ink)]">By category</h2>
        <p className="text-xs text-[var(--c-muted)]">
          Reading board · manage categories in Setup
        </p>
      </div>

      {uncategorizedThreads.length > 0 ? (
        <section className="grid gap-3 border-l-4 border-[var(--c-warning)] pl-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-base font-medium text-[var(--c-ink)]">
              Uncategorized
            </h3>
            <Badge tone="warning">{uncategorizedThreads.length}</Badge>
          </div>
          {uncategorizedThreads.map((thread) => (
            <ThreadCard key={thread.root.submission.id} thread={thread} />
          ))}
        </section>
      ) : null}

      {categoryGroups.length === 0 && uncategorizedThreads.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--c-muted)]">No submissions yet.</p>
        </Card>
      ) : null}

      {categoryGroups.map(({ category, threads }, index) => (
        <section
          key={category.id}
          className="grid gap-3 border-l-4 pl-4"
          style={{ borderColor: `var(--c-sig-${categoryColorToTone(category.color, index)})` }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-medium text-[var(--c-ink)]">
                {category.name}
              </h3>
              {category.description ? (
                <p className="text-xs text-[var(--c-muted)]">{category.description}</p>
              ) : null}
            </div>
            <Badge tone="neutral">{threads.length}</Badge>
          </div>
          {threads.map((thread) => (
            <ThreadCard key={thread.root.submission.id} thread={thread} />
          ))}
        </section>
      ))}
    </section>
  );
}
