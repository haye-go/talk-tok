import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface PretextDisplayProps extends HTMLAttributes<HTMLDivElement> {
  text: string;
  variant?: "body" | "quote" | "summary";
}

export function PretextDisplay({
  className,
  text,
  variant = "body",
  ...props
}: PretextDisplayProps) {
  return (
    <div
      data-pretext-boundary
      data-variant={variant}
      className={cn(
        "whitespace-pre-wrap text-sm leading-6 text-[var(--c-body)]",
        variant === "quote" && "border-l-2 border-[var(--c-sig-peach)] pl-3 italic",
        className,
      )}
      {...props}
    >
      {text}
    </div>
  );
}
