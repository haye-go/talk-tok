import { useRef, useState } from "react";
import { Fire } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FightCountdown } from "@/components/fight/fight-countdown";
import { Button } from "@/components/ui/button";

interface FightDraftComposerProps {
  sessionSlug: string;
  fightSlug: string;
  clientKey: string;
  mode: "turn" | "pending-draft" | "waiting";
  turnDeadlineAt?: number;
  existingDraft?: string;
  placeholder?: string;
}

export function FightDraftComposer({
  sessionSlug,
  fightSlug,
  clientKey,
  mode,
  turnDeadlineAt,
  existingDraft,
  placeholder = "Your rebuttal...",
}: FightDraftComposerProps) {
  const [textOverride, setTextOverride] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const saveDraft = useMutation(api.fightMe.saveDraft);
  const submitTurn = useMutation(api.fightMe.submitTurn);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const text = textOverride ?? existingDraft ?? "";
  const canEdit = mode === "turn" || mode === "pending-draft";
  const canSubmit = mode === "turn";

  function handleChange(value: string) {
    if (!canEdit) return;
    setTextOverride(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveDraft({ sessionSlug, fightSlug, clientKey, body: value });
    }, 800);
  }

  function handleBlur() {
    if (!canEdit) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    void saveDraft({ sessionSlug, fightSlug, clientKey, body: text });
  }

  async function handleSubmit() {
    if (!canSubmit || !text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await submitTurn({ sessionSlug, fightSlug, clientKey, body: text.trim() });
      setTextOverride("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border border-[var(--c-tab-fight)] bg-[var(--c-surface-soft)] p-3">
      {turnDeadlineAt && (
        <div className="mb-2">
          <FightCountdown
            deadlineAt={turnDeadlineAt}
            label={canSubmit ? "Your turn:" : "Waiting:"}
          />
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={!canEdit || submitting}
        className="w-full resize-none border-none bg-transparent text-sm text-[var(--c-body)] placeholder:text-[var(--c-muted)] focus:outline-none disabled:opacity-50"
        style={{ minHeight: 56, fontFamily: "var(--font-body)" }}
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-[var(--c-muted)]">
          {text.length > 0
            ? mode === "pending-draft"
              ? "Draft auto-saved. It sends if your opponent accepts."
              : "Draft auto-saved"
            : ""}
        </span>
        <Button
          variant="coral"
          size="sm"
          icon={<Fire size={12} weight="fill" />}
          onClick={handleSubmit}
          disabled={!canSubmit || !text.trim() || submitting}
        >
          {submitting ? "Sending..." : mode === "pending-draft" ? "Sends on accept" : "Fire Back"}
        </Button>
      </div>
    </div>
  );
}
