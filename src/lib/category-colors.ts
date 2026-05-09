import type { BadgeProps } from "@/components/ui/badge";

const CATEGORY_COLOR_CYCLE: NonNullable<BadgeProps["tone"]>[] = [
  "sky",
  "peach",
  "mustard",
  "coral",
  "slate",
  "yellow",
  "cream",
];

const KNOWN_TONES = new Set([
  "sky",
  "peach",
  "mustard",
  "coral",
  "slate",
  "yellow",
  "cream",
  "neutral",
]);

export function categoryColorToTone(
  color?: string | null,
  index?: number,
): NonNullable<BadgeProps["tone"]> {
  if (color && KNOWN_TONES.has(color)) return color as NonNullable<BadgeProps["tone"]>;
  if (typeof index === "number") return CATEGORY_COLOR_CYCLE[index % CATEGORY_COLOR_CYCLE.length];
  return "neutral";
}
