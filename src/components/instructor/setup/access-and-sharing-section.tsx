import { useState } from "react";
import { FloppyDisk } from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { routes } from "@/lib/routes";

export interface AccessAndSharingSectionProps {
  sessionSlug: string;
  joinCode: string;
  joinUrl: string;
}

export function AccessAndSharingSection({
  sessionSlug,
  joinCode,
  joinUrl,
}: AccessAndSharingSectionProps) {
  const saveAsTemplate = useMutation(api.sessionTemplates.createFromSession);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  async function handleSaveTemplate() {
    setSavingTemplate(true);
    try {
      await saveAsTemplate({ sessionSlug });
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 3000);
    } finally {
      setSavingTemplate(false);
    }
  }

  return (
    <div className="grid content-start gap-5">
      <Card title="Join Access" eyebrow={joinCode}>
        <div className="grid justify-items-start gap-3">
          <div className="rounded-md bg-white p-3">
            <QRCodeSVG value={joinUrl} size={140} />
          </div>
          <p className="break-all text-xs text-[var(--c-muted)]">{joinUrl}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => (window.location.href = routes.instructorProjector(sessionSlug))}
          >
            Open projector
          </Button>
        </div>
      </Card>

      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        icon={<FloppyDisk size={14} />}
        onClick={() => void handleSaveTemplate()}
        disabled={savingTemplate}
      >
        {templateSaved ? "Template saved!" : savingTemplate ? "Saving..." : "Save as Template"}
      </Button>
    </div>
  );
}
