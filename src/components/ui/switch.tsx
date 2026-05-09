import { Switch as BaseSwitch } from "@base-ui/react/switch";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends ComponentProps<typeof BaseSwitch.Root> {
  label?: string;
}

export function Switch({ className, label, ...props }: SwitchProps) {
  return (
    <label className="inline-flex items-center gap-3 text-sm text-[var(--c-ink)]">
      <BaseSwitch.Root
        className={cn(
          "relative inline-flex h-7 w-12 cursor-pointer rounded-pill border border-[var(--c-hairline)] bg-[var(--c-surface-strong)] transition data-[checked]:bg-[var(--c-primary)] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          className,
        )}
        {...props}
      >
        <BaseSwitch.Thumb className="absolute left-1 top-1 size-5 rounded-full bg-[var(--c-canvas)] shadow-sm transition-transform data-[checked]:translate-x-5" />
      </BaseSwitch.Root>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
