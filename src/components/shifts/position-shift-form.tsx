import { useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PositionShiftFormProps {
  sessionSlug: string;
  clientKey: string;
  onRecorded?: () => void;
}

export function PositionShiftForm({ sessionSlug, clientKey, onRecorded }: PositionShiftFormProps) {
  const record = useMutation(api.positionShifts.record);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [influencedBy, setInfluencedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (reason.length < 5 || submitting) return;
    setSubmitting(true);
    try {
      await record({
        sessionSlug,
        clientKey,
        reason,
        influencedBy: influencedBy || undefined,
      });
      setReason("");
      setInfluencedBy("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      onRecorded?.();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3 text-left transition-colors hover:bg-[var(--c-surface-strong)]"
      >
        <ArrowsClockwise size={20} className="shrink-0 text-[var(--c-link)]" />
        <div>
          <p className="text-xs text-[var(--c-ink)]">Changed your mind?</p>
          <p className="text-[10px] text-[var(--c-muted)]">
            Flag a position shift and tell us what convinced you
          </p>
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-md border border-[var(--c-sig-mustard)] bg-[var(--c-surface-soft)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-display text-xs font-medium text-[var(--c-sig-mustard)]">
          <ArrowsClockwise size={14} />
          My thinking changed
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[10px] text-[var(--c-muted)] hover:text-[var(--c-ink)]"
        >
          Cancel
        </button>
      </div>
      <Textarea
        label="What changed?"
        placeholder="Describe how your thinking shifted..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <Textarea
        label="What influenced this? (optional)"
        placeholder="A specific response, argument, or insight..."
        value={influencedBy}
        onChange={(e) => setInfluencedBy(e.target.value)}
        className="mt-2"
      />
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={reason.length < 5 || submitting}>
          {submitting ? "Recording..." : "Record Shift"}
        </Button>
        {success && <span className="text-[10px] text-[var(--c-success)]">Recorded!</span>}
      </div>
    </div>
  );
}
