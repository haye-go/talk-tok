import type { BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StreamItem {
  nickname: string;
  text: string;
  categoryColor: NonNullable<BadgeProps["tone"]>;
}

interface StreamPreviewProps {
  items: StreamItem[];
  typingCount?: number;
  submittedCount?: number;
  className?: string;
}

const colorVar: Record<string, string> = {
  sky: "var(--c-sig-sky)",
  peach: "var(--c-sig-peach)",
  mustard: "var(--c-sig-mustard)",
  coral: "var(--c-sig-coral)",
  slate: "var(--c-sig-slate)",
  yellow: "var(--c-sig-yellow)",
  cream: "var(--c-sig-cream)",
  neutral: "var(--c-sig-slate)",
};

export function StreamPreview({
  items,
  typingCount = 0,
  submittedCount = 0,
  className,
}: StreamPreviewProps) {
  return (
    <div className={cn(className)}>
      <div className="mb-1.5 text-xs text-[var(--c-muted)]">
        {typingCount} others responding · {submittedCount} submitted
      </div>
      <div className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)]">
        {items.slice(0, 3).map((item, i) => (
          <div
            key={i}
            className={cn(
              "px-3 py-2 text-xs text-[var(--c-body)]",
              i > 0 && "border-t border-[var(--c-hairline)]",
            )}
          >
            <strong style={{ color: colorVar[item.categoryColor] ?? "var(--c-sig-slate)" }}>
              {item.nickname}:
            </strong>{" "}
            {item.text.length > 80 ? `${item.text.slice(0, 80)}...` : item.text}
          </div>
        ))}
      </div>
    </div>
  );
}
