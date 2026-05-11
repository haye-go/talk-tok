import { useState } from "react";
import { BookOpen, CircleNotch, Flag, Scales, Sparkle, Trash } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BadgeProps } from "@/components/ui/badge";

interface Artifact {
  id: Id<"synthesisArtifacts">;
  kind: string;
  status: string;
  title: string;
  summary?: string | null;
  keyPoints?: string[];
  uniqueInsights?: string[];
  opposingViews?: string[];
  error?: string | null;
  generatedAt?: number | null;
  publishedAt?: number | null;
  finalizedAt?: number | null;
}

interface SynthesisArtifactCardProps {
  artifact: Artifact;
  sessionSlug: string;
  isInstructor?: boolean;
}

const KIND_ICON: Record<string, typeof Sparkle> = {
  category_summary: BookOpen,
  class_synthesis: Sparkle,
  opposing_views: Scales,
  final_summary: Flag,
};

const STATUS_TONE: Record<string, NonNullable<BadgeProps["tone"]>> = {
  queued: "warning",
  processing: "warning",
  draft: "neutral",
  published: "sky",
  final: "success",
  error: "error",
  archived: "neutral",
};

function statusDescription(status: string, isInstructor?: boolean) {
  if (status === "draft") {
    return "Draft is visible to instructors only. Publish it when learners should see it.";
  }
  if (status === "published") {
    return isInstructor
      ? "Published for learners, subject to this question's visibility controls."
      : "Released by the instructor for this question.";
  }
  if (status === "final") {
    return isInstructor
      ? "Final version for learners, subject to this question's visibility controls."
      : "Final version released by the instructor.";
  }
  if (status === "queued" || status === "processing") {
    return "Generation is still running.";
  }
  if (status === "error") {
    return "Generation failed. The error is shown below.";
  }
  return null;
}

export function SynthesisArtifactCard({
  artifact,
  sessionSlug,
  isInstructor,
}: SynthesisArtifactCardProps) {
  const Icon = KIND_ICON[artifact.kind] ?? Sparkle;
  const tone = STATUS_TONE[artifact.status] ?? "neutral";
  const isGenerating = artifact.status === "queued" || artifact.status === "processing";
  const helperText = statusDescription(artifact.status, isInstructor);

  const publish = useMutation(api.synthesis.publishArtifact);
  const finalize = useMutation(api.synthesis.finalizeArtifact);
  const archive = useMutation(api.synthesis.archiveArtifact);
  const [busy, setBusy] = useState(false);

  async function handleAction(action: "publish" | "finalize" | "archive") {
    setBusy(true);
    try {
      const args = { sessionSlug, artifactId: artifact.id };
      if (action === "publish") await publish(args);
      else if (action === "finalize") await finalize(args);
      else await archive(args);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3">
      <div className="flex items-center justify-between">
        <span className="font-display text-xs font-semibold text-[var(--c-ink)]">
          <Icon size={12} className="mr-1 inline" />
          {artifact.title}
        </span>
        <Badge tone={tone} className="text-[9px]">
          {isGenerating && <CircleNotch size={10} className="mr-0.5 inline animate-spin" />}
          {artifact.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {helperText ? (
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--c-muted)]">{helperText}</p>
      ) : null}

      {artifact.summary && (
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--c-body)]">{artifact.summary}</p>
      )}

      {artifact.keyPoints && artifact.keyPoints.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 pl-3">
          {artifact.keyPoints.map((point, i) => (
            <li key={i} className="list-disc text-[11px] leading-relaxed text-[var(--c-body)]">
              {point}
            </li>
          ))}
        </ul>
      )}

      {artifact.uniqueInsights && artifact.uniqueInsights.length > 0 && (
        <div className="mt-1.5">
          <p className="text-[10px] font-medium text-[var(--c-muted)]">
            {artifact.uniqueInsights.length} unique insight
            {artifact.uniqueInsights.length !== 1 ? "s" : ""}
          </p>
          {artifact.uniqueInsights.map((insight, i) => (
            <p key={i} className="mt-0.5 text-[11px] italic leading-relaxed text-[var(--c-body)]">
              {insight}
            </p>
          ))}
        </div>
      )}

      {artifact.opposingViews && artifact.opposingViews.length > 0 && (
        <div className="mt-1.5">
          <p className="text-[10px] font-medium text-[var(--c-sig-coral)]">
            <Scales size={10} className="mr-0.5 inline" />
            Opposing views
          </p>
          {artifact.opposingViews.map((view, i) => (
            <p key={i} className="mt-0.5 text-[11px] leading-relaxed text-[var(--c-body)]">
              {view}
            </p>
          ))}
        </div>
      )}

      {artifact.status === "error" && artifact.error && (
        <p className="mt-1.5 text-[11px] text-[var(--c-error)]">{artifact.error}</p>
      )}

      {isInstructor && !isGenerating && artifact.status !== "archived" && (
        <div className="mt-2 flex gap-1.5">
          {artifact.status === "draft" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleAction("publish")}
              disabled={busy}
            >
              Publish
            </Button>
          )}
          {artifact.status === "published" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleAction("finalize")}
              disabled={busy}
            >
              Finalize
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => handleAction("archive")} disabled={busy}>
            <Trash size={12} className="mr-0.5 inline" /> Archive
          </Button>
        </div>
      )}
    </div>
  );
}
