import { useState } from "react";
import { FloppyDisk } from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
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
  const [urlCopied, setUrlCopied] = useState(false);

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

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      // ignore — clipboard may be blocked, the URL is visible anyway
    }
  }

  return (
    <div className="grid content-start gap-4">
      <header className="border-b border-[var(--c-hairline)] pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
          Join Access
        </p>
        <p className="mt-1 font-mono text-sm font-semibold text-[var(--c-ink)]">{joinCode}</p>
      </header>

      <div className="self-start rounded-md bg-white p-3">
        <QRCodeSVG value={joinUrl} size={140} />
      </div>

      <p className="break-all font-mono text-[11px] leading-5 text-[var(--c-muted)]">{joinUrl}</p>

      <div className="grid gap-1.5">
        <Button type="button" size="sm" variant="ghost" onClick={() => void handleCopyUrl()}>
          {urlCopied ? "URL copied!" : "Copy URL"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => (window.location.href = routes.instructorProjector(sessionSlug))}
        >
          Open projector
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={<FloppyDisk size={14} />}
          onClick={() => void handleSaveTemplate()}
          disabled={savingTemplate}
        >
          {templateSaved ? "Template saved!" : savingTemplate ? "Saving..." : "Save as Template"}
        </Button>
      </div>
    </div>
  );
}
