import { useState } from "react";
import { Archive, Rocket } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AdminShell } from "@/components/layout/admin-shell";
import { EmptyState } from "@/components/state/empty-state";
import { LoadingState } from "@/components/state/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { routes } from "@/lib/routes";

const MODE_LABELS: Record<string, string> = {
  class_discussion: "Class Discussion",
  conference_qna: "Conference Q&A",
  debate_lab: "Workshop",
  custom: "Custom",
};

export function TemplatesPage() {
  const templates = useQuery(api.sessionTemplates.list, {});
  const createFromTemplate = useMutation(api.sessionTemplates.createSessionFromTemplate);
  const archiveTemplate = useMutation(api.sessionTemplates.archive);
  const [creatingId, setCreatingId] = useState<Id<"sessionTemplates"> | null>(null);
  const [archivingId, setArchivingId] = useState<Id<"sessionTemplates"> | null>(null);

  async function handleCreate(templateId: Id<"sessionTemplates">) {
    setCreatingId(templateId);
    try {
      const session = await createFromTemplate({ templateId });
      window.location.href = routes.instructorSession(session.slug);
    } finally {
      setCreatingId(null);
    }
  }

  async function handleArchive(templateId: Id<"sessionTemplates">) {
    setArchivingId(templateId);
    try {
      await archiveTemplate({ templateId });
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <AdminShell title="Templates" description="Reusable session configurations.">
      {templates === undefined && <LoadingState label="Loading templates..." />}

      {templates && templates.length === 0 && (
        <EmptyState
          title="No templates yet"
          description="Save a session as a template from the instructor session page, or create one when setting up a new session."
        />
      )}

      {templates && templates.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} title={t.name} eyebrow={MODE_LABELS[t.modePreset] ?? t.modePreset}>
              {t.description && (
                <p className="mb-2 text-xs leading-relaxed text-[var(--c-body)]">{t.description}</p>
              )}
              <div className="mb-2 flex flex-wrap gap-1">
                <Badge tone="slate" className="text-[9px]">
                  {t.visibilityMode.replace(/_/g, " ")}
                </Badge>
                <Badge tone="neutral" className="text-[9px]">
                  {t.anonymityMode === "anonymous_to_peers" ? "Anonymous" : "Nicknames"}
                </Badge>
                <Badge tone="peach" className="text-[9px]">
                  {t.critiqueToneDefault}
                </Badge>
                {t.fightMeEnabled && (
                  <Badge tone="coral" className="text-[9px]">
                    Fight Me
                  </Badge>
                )}
                {t.summaryGateEnabled && (
                  <Badge tone="mustard" className="text-[9px]">
                    Summary Gate
                  </Badge>
                )}
              </div>
              {t.presetCategories.length > 0 && (
                <p className="mb-2 text-[10px] text-[var(--c-muted)]">
                  {t.presetCategories.length} preset{" "}
                  {t.presetCategories.length === 1 ? "category" : "categories"}
                </p>
              )}
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="flex-1"
                  icon={<Rocket size={12} />}
                  onClick={() => handleCreate(t.id)}
                  disabled={creatingId === t.id}
                >
                  {creatingId === t.id ? "Creating..." : "Use"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Archive size={12} />}
                  onClick={() => handleArchive(t.id)}
                  disabled={archivingId === t.id}
                >
                  Archive
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
