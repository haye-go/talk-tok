import { ArrowCounterClockwise, CheckCircle, FloppyDisk, WarningCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/state/loading-state";
import { cn } from "@/lib/utils";

export function AdminPromptsPage() {
  const prompts = useQuery(api.promptTemplates.list);
  const updatePrompt = useMutation(api.promptTemplates.update);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editedTemplate, setEditedTemplate] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = prompts?.find((p) => p.key === selectedKey) ?? prompts?.[0] ?? null;

  function selectPrompt(key: string) {
    const prompt = prompts?.find((p) => p.key === key);
    setSelectedKey(key);
    if (prompt) setEditedTemplate(prompt.userTemplate);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      await updatePrompt({
        key: selected.key,
        userTemplate: editedTemplate,
      });
    } finally {
      setSaving(false);
    }
  }

  if (selected && selectedKey !== selected.key) {
    setSelectedKey(selected.key);
    setEditedTemplate(selected.userTemplate);
  }

  return (
    <AdminShell title="Prompt Templates" description="Edit and version prompts for each AI feature.">
      {prompts === undefined && <LoadingState label="Loading prompts..." />}
      {prompts && (
        <div className="flex gap-4">
          <div className="w-52 shrink-0 space-y-1">
            {prompts.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => selectPrompt(p.key)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                  selected?.key === p.key
                    ? "bg-[var(--c-surface-strong)] text-[var(--c-ink)]"
                    : "text-[var(--c-body)] hover:bg-[var(--c-surface-soft)]",
                )}
              >
                <span>{p.name}</span>
                <CheckCircle size={14} className="text-[var(--c-success)]" />
              </button>
            ))}
          </div>

          {selected && (
            <div className="flex-1 space-y-4">
              <Card
                title={selected.name}
                action={
                  <div className="flex gap-2">
                    <Badge tone="neutral">v{selected.version}</Badge>
                  </div>
                }
              >
                <p className="mb-2 text-xs text-[var(--c-muted)]">System prompt:</p>
                <pre className="mb-3 rounded-sm bg-[var(--c-surface-strong)] p-2 font-mono text-[10px] text-[var(--c-body)]" style={{ whiteSpace: "pre-wrap" }}>
                  {selected.systemPrompt}
                </pre>

                <p className="mb-2 text-xs text-[var(--c-muted)]">User template:</p>
                <textarea
                  value={editedTemplate || selected.userTemplate}
                  onChange={(e) => setEditedTemplate(e.target.value)}
                  className="w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] p-3 font-mono text-xs leading-relaxed text-[var(--c-body)] focus:border-[var(--c-info-border)] focus:outline-none"
                  style={{ minHeight: 200, fontFamily: "var(--font-mono)" }}
                />

                <div className="mt-3 flex justify-end gap-2">
                  <Button size="sm" icon={<FloppyDisk size={14} />} onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}
