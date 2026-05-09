import { ArrowCounterClockwise, CheckCircle, FloppyDisk, WarningCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PROMPT_FEATURES = [
  { id: "moderation", label: "Moderation", status: "valid" as const },
  { id: "private-feedback", label: "Private Feedback", status: "valid" as const },
  { id: "categorization", label: "Categorization", status: "valid" as const },
  { id: "overlap-detection", label: "Overlap Detection", status: "warning" as const },
  { id: "summary", label: "Summary Generation", status: "valid" as const },
  { id: "fight-me", label: "Fight Me", status: "valid" as const },
  { id: "reflection", label: "Reflection / Report", status: "valid" as const },
];

const MOCK_PROMPT = `You are evaluating a student's response for originality and depth.

Session topic: {{topic}}
Student response: {{response}}
Reference answer: {{reference}}

Evaluate on these dimensions:
- Clarity: Is the argument well-structured?
- Depth: Does it go beyond surface-level?
- Distinctiveness: Does it offer angles the reference misses?
- Support: Are claims justified?

Respond in this JSON format:
{
  "clarity": "brief assessment",
  "depth": "brief assessment",
  "distinctiveness": "brief assessment",
  "support": "brief assessment",
  "overall": "qualitative coaching paragraph",
  "originality_band": "low | medium | high | exceptional"
}`;

export function AdminPromptsPage() {
  const [selected, setSelected] = useState("private-feedback");

  return (
    <AdminShell title="Prompt Templates" description="Edit and version prompts for each AI feature.">
      <div className="flex gap-4">
        <div className="w-52 shrink-0 space-y-1">
          {PROMPT_FEATURES.map((pf) => (
            <button
              key={pf.id}
              type="button"
              onClick={() => setSelected(pf.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                selected === pf.id
                  ? "bg-[var(--c-surface-strong)] text-[var(--c-ink)]"
                  : "text-[var(--c-body)] hover:bg-[var(--c-surface-soft)]",
              )}
            >
              <span>{pf.label}</span>
              {pf.status === "valid" ? (
                <CheckCircle size={14} className="text-[var(--c-success)]" />
              ) : (
                <WarningCircle size={14} className="text-[var(--c-warning)]" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4">
          <Card
            title={PROMPT_FEATURES.find((p) => p.id === selected)?.label ?? ""}
            action={
              <div className="flex gap-2">
                <Badge tone="neutral">v3 (current)</Badge>
                <Button size="sm" variant="ghost" icon={<ArrowCounterClockwise size={14} />}>
                  Revert
                </Button>
              </div>
            }
          >
            <textarea
              defaultValue={MOCK_PROMPT}
              className="w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] p-3 font-mono text-xs leading-relaxed text-[var(--c-body)] focus:border-[var(--c-info-border)] focus:outline-none"
              style={{ minHeight: 280, fontFamily: "var(--font-mono)" }}
            />
            <p className="mt-3 text-xs text-[var(--c-muted)]">
              Available variables:{" "}
              <code className="rounded bg-[var(--c-surface-strong)] px-1 font-mono text-[10px]">{"{{topic}}"}</code>{" "}
              <code className="rounded bg-[var(--c-surface-strong)] px-1 font-mono text-[10px]">{"{{response}}"}</code>{" "}
              <code className="rounded bg-[var(--c-surface-strong)] px-1 font-mono text-[10px]">{"{{reference}}"}</code>{" "}
              <code className="rounded bg-[var(--c-surface-strong)] px-1 font-mono text-[10px]">{"{{tone}}"}</code>
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="secondary" size="sm">Test Prompt</Button>
              <Button size="sm" icon={<FloppyDisk size={14} />}>Save</Button>
            </div>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
