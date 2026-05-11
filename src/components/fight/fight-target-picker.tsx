import { useState } from "react";
import { Lightning } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/state/loading-state";

interface FightTargetPickerProps {
  sessionSlug: string;
  clientKey: string;
  onChallengeCreated: (fightSlug: string) => void;
  onCancel: () => void;
}

export function FightTargetPicker({
  sessionSlug,
  clientKey,
  onChallengeCreated,
  onCancel,
}: FightTargetPickerProps) {
  const targets = useQuery(api.fightMe.findAvailableTargets, { sessionSlug, clientKey });
  const createChallenge = useMutation(api.fightMe.createChallenge);
  const [creating, setCreating] = useState(false);

  async function handleChallenge(defenderSubmissionId: string) {
    setCreating(true);
    try {
      const result = await createChallenge({
        sessionSlug,
        clientKey,
        defenderSubmissionId: defenderSubmissionId as Id<"submissions">,
      });
      onChallengeCreated(result.slug);
    } catch {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-medium text-[var(--c-ink)]">
          <Lightning size={14} className="mr-1 inline text-[var(--c-sig-coral)]" />
          Pick a response to challenge
        </h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {targets === undefined && <LoadingState label="Finding targets..." />}

      {targets && targets.length === 0 && (
        <Card>
          <p className="text-sm text-[var(--c-muted)]">
            No available targets right now. Other participants may be in active fights.
          </p>
        </Card>
      )}

      {targets && targets.length > 0 && (
        <div className="space-y-2">
          {targets.map((target) => (
            <div
              key={target.submissionId}
              className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
            >
              <div className="flex items-center justify-between">
                <strong className="font-display text-xs text-[var(--c-ink)]">
                  {target.nickname}
                </strong>
                <span className="text-[10px] text-[var(--c-muted)]">{target.wordCount} words</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--c-body)]">
                {target.body.length > 120 ? `${target.body.slice(0, 120)}...` : target.body}
              </p>
              <div className="mt-2 text-right">
                <Button
                  variant="coral"
                  size="sm"
                  onClick={() => handleChallenge(target.submissionId as string)}
                  disabled={creating}
                >
                  Challenge
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
