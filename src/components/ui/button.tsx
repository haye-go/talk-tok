import { type VariantProps } from "class-variance-authority";
import { useNavigate } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
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
  onClick,
  ...props
}: ButtonLinkProps) {
  const navigate = useNavigate();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      props.target ||
      !href?.startsWith("/")
    ) {
      return;
    }

    event.preventDefault();
    void navigate({ to: href });
  }

  return (
    <a
      href={href}
      className={cn(buttonVariants({ variant, size }), "no-underline", className)}
      onClick={handleClick}
      {...props}
    >
      {icon ? <span className="mr-2 inline-flex">{icon}</span> : null}
      {children}
    </a>
  );
}
