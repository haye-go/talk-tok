import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FightCountdownProps {
  deadlineAt: number;
  label?: string;
  className?: string;
}

export function FightCountdown({ deadlineAt, label, className }: FightCountdownProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)));

  useEffect(() => {
    const id = setInterval(() => {
      const secs = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [deadlineAt]);

  const urgent = remaining <= 5;

  return (
    <div className={cn("flex items-center gap-2 font-display text-xs font-medium", className)}>
      {label && <span className="text-[var(--c-muted)]">{label}</span>}
      <span className={cn("tabular-nums", urgent ? "text-[var(--c-error)]" : "text-[var(--c-sig-mustard)]")}>
        {remaining}s
      </span>
      {urgent && <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--c-error)]" />}
    </div>
  );
}
