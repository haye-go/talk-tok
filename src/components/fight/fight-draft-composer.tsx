import { useEffect, useRef, useState } from "react";
import { Fire } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FightCountdown } from "@/components/fight/fight-countdown";
import { Button } from "@/components/ui/button";

interface FightDraftComposerProps {
  sessionSlug: string;
  fightSlug: string;
  clientKey: string;
  isMyTurn: boolean;
  turnDeadlineAt?: number;
  existingDraft?: string;
  placeholder?: string;
}

export function FightDraftComposer({
  sessionSlug,
  fightSlug,
  clientKey,
  isMyTurn,
  turnDeadlineAt,
  existingDraft,
  placeholder = "Your rebuttal...",
}: FightDraftComposerProps) {
  const [text, setText] = useState(existingDraft ?? "");
  const [submitting, setSubmitting] = useState(false);
  const saveDraft = useMutation(api.fightMe.saveDraft);
  const submitTurn = useMutation(api.fightMe.submitTurn);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (existingDraft !== undefined && existingDraft !== text) {
      setText(existingDraft);
    }
  }, [existingDraft]);

  function handleChange(value: string) {
    setText(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveDraft({ sessionSlug, fightSlug, clientKey, body: value });
    }, 2500);
  }

  async function handleSubmit() {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await submitTurn({ sessionSlug, fightSlug, clientKey, body: text.trim() });
      setText("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border bg-[var(--c-surface-soft)] p-3" style={{ borderColor: "var(--c-sig-coral)" }}>
      {turnDeadlineAt && (
        <div className="mb-2">
          <FightCountdown deadlineAt={turnDeadlineAt} label={isMyTurn ? "Your turn:" : "Waiting:"} />
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        disabled={!isMyTurn || submitting}
        className="w-full resize-none border-none bg-transparent text-sm text-[var(--c-body)] placeholder:text-[var(--c-muted)] focus:outline-none disabled:opacity-50"
        style={{ minHeight: 56, fontFamily: "var(--font-body)" }}
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-[var(--c-muted)]">
          {text.length > 0 ? "Draft auto-saved" : ""}
        </span>
        <Button
          variant="coral"
          size="sm"
          icon={<Fire size={12} weight="fill" />}
          onClick={handleSubmit}
          disabled={!isMyTurn || !text.trim() || submitting}
        >
          {submitting ? "Sending..." : "Fire Back"}
        </Button>
      </div>
    </div>
  );
}
