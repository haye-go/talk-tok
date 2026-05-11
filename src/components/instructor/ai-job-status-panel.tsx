import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type AiJobTone = "neutral" | "success" | "warning" | "error" | "sky";

export interface AiJobStatusItem {
  label: string;
  status: string;
  detail: string;
  tone: AiJobTone;
  error?: string | null;
  updatedAt?: number | null;
}

interface AiJobStatusPanelProps {
  items: AiJobStatusItem[];
}

export function AiJobStatusPanel({ items }: AiJobStatusPanelProps) {
  return (
    <Card title="AI Workflow Status">
      <div className="grid gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-start justify-between gap-3 rounded-sm border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-2.5"
          >
            <div>
              <p className="text-xs font-medium text-[var(--c-ink)]">{item.label}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-[var(--c-muted)]">{item.detail}</p>
              {item.error ? (
                <p className="mt-1 text-[11px] leading-4 text-[var(--c-error)]">{item.error}</p>
              ) : null}
              {item.updatedAt ? (
                <p className="mt-1 text-[10px] text-[var(--c-muted)]">
                  Updated{" "}
                  {new Date(item.updatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              ) : null}
            </div>
            <Badge tone={item.tone} className="shrink-0 text-[9px]">
              {item.status}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
