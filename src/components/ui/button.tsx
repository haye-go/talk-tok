import { type VariantProps } from "class-variance-authority";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  icon?: ReactNode;
}

export interface ButtonLinkProps
  extends AnchorHTMLAttributes<HTMLAnchorElement>, VariantProps<typeof buttonVariants> {
  icon?: ReactNode;
}

export function Button({ className, icon, children, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {icon ? <span className="mr-2 inline-flex">{icon}</span> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  className,
  icon,
  children,
  variant,
  size,
  href,
  ...props
}: ButtonLinkProps) {
  return (
    <a
      href={href}
      className={cn(buttonVariants({ variant, size }), "no-underline", className)}
      {...props}
    >
      {icon ? <span className="mr-2 inline-flex">{icon}</span> : null}
      {children}
    </a>
  );
}
