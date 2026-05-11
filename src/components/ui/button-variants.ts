import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-info-border)] disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--c-primary)] text-[var(--c-on-primary)] hover:bg-[var(--c-primary-active)]",
        secondary:
          "border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] text-[var(--c-ink)] hover:bg-[var(--c-surface-strong)]",
        ghost: "text-[var(--c-ink)] hover:bg-[var(--c-surface-soft)]",
        coral: "bg-[var(--c-sig-coral)] text-[var(--c-on-sig-dark)] hover:brightness-95",
        danger: "bg-[var(--c-error)] text-white hover:brightness-95",
      },
      size: {
        sm: "min-h-9 rounded-sm px-3 text-xs",
        md: "min-h-11 px-4 text-sm",
        lg: "min-h-12 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);
