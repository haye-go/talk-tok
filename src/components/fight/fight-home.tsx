import { useState } from "react";
import { Lightning, Robot, Swords } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FightCountdown } from "@/components/fight/fight-countdown";
import { FightTargetPicker } from "@/components/fight/fight-target-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface FightThread {
  id: string;
  slug: string;
  mode: string;
  status: string;
  acceptanceDeadlineAt?: number;
  createdAt: number;
}

interface FightHomeProps {
  myFights: FightThread[];
  pendingIncoming: FightThread[];
  currentFight: FightThread | null;
  fightMeEnabled: boolean;
  sessionSlug: string;
  clientKey: string;
  mySubmissionId?: string;
  onNavigateToThread: (fightSlug: string) => void;
}

const STATUS_TONE: Record<string, "success" | "sky" | "coral" | "neutral" | "warning"> = {
  completed: "success",
  active: "sky",
  pending_acceptance: "warning",
  declined: "neutral",
  expired: "neutral",
  timed_out: "coral",
  cancelled: "neutral",
  forfeited: "coral",
};

export function FightHome({
  myFights,
  pendingIncoming,
  currentFight,
  fightMeEnabled,
  sessionSlug,
  clientKey,
  mySubmissionId,
  onNavigateToThread,
}: FightHomeProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [creatingAi, setCreatingAi] = useState(false);
  const createVsAi = useMutation(api.fightMe.createVsAi);
  const acceptChallenge = useMutation(api.fightMe.acceptChallenge);
  const declineChallenge = useMutation(api.fightMe.declineChallenge);

  async function handleCreateVsAi() {
    if (!mySubmissionId || creatingAi) return;
    setCreatingAi(true);
    try {
      const result = await createVsAi({
        sessionSlug,
        clientKey,
        sourceSubmissionId: mySubmissionId as any,
      });
      onNavigateToThread(result.slug);
    } finally {
      setCreatingAi(false);
    }
  }

  if (!fightMeEnabled) {
    return (
      <Card>
        <p className="text-sm text-[var(--c-muted)]">Fight Me mode is not enabled for this session.</p>
      </Card>
    );
  }

  if (showPicker) {
    return (
      <FightTargetPicker
        sessionSlug={sessionSlug}
        clientKey={clientKey}
        onChallengeCreated={(slug) => {
          setShowPicker(false);
          onNavigateToThread(slug);
        }}
        onCancel={() => setShowPicker(false)}
      />
    );
  }

  if (currentFight) {
    return (
      <div className="space-y-3">
        <Card>
          <div className="text-center">
            <Swords size={24} className="mx-auto mb-2 text-[var(--c-sig-coral)]" />
            <p className="font-display text-sm font-medium text-[var(--c-ink)]">
              You have an active fight!
            </p>
            <Button
              variant="coral"
              className="mt-3"
              onClick={() => onNavigateToThread(currentFight.slug)}
            >
              Go to Fight
            </Button>
          </div>
        </Card>
        {myFights.length > 1 && <PastFights fights={myFights} onNavigate={onNavigateToThread} />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Pending incoming challenges */}
      {pendingIncoming.map((challenge) => (
        <div
          key={challenge.id}
          className="rounded-md border bg-[var(--c-surface-soft)] p-4"
          style={{ borderColor: "var(--c-sig-coral)" }}
        >
          <div className="flex items-center justify-between">
            <p className="font-display text-sm font-medium text-[var(--c-sig-coral)]">
              <Swords size={14} className="mr-1 inline" />
              Incoming Challenge!
            </p>
            {challenge.acceptanceDeadlineAt && (
              <FightCountdown deadlineAt={challenge.acceptanceDeadlineAt} label="" />
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="coral"
              size="sm"
              className="flex-1"
              onClick={() => void acceptChallenge({ sessionSlug, fightSlug: challenge.slug, clientKey })}
            >
              Accept
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => void declineChallenge({ sessionSlug, fightSlug: challenge.slug, clientKey })}
            >
              Decline
            </Button>
          </div>
        </div>
      ))}

      {/* Start new fight CTAs */}
      <div className="rounded-md bg-[var(--c-surface-soft)] p-4 text-center" style={{ border: "1px solid var(--c-sig-coral)" }}>
        <Lightning size={28} weight="fill" className="mx-auto mb-1 text-[var(--c-sig-coral)]" />
        <p className="font-display text-base font-medium text-[var(--c-sig-coral)]">Fight Me Mode</p>
        <p className="mt-1 text-xs text-[var(--c-muted)]">
          Challenge AI or another participant to a structured debate
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            variant="coral"
            className="flex-1"
            icon={<Robot size={14} />}
            onClick={handleCreateVsAi}
            disabled={!mySubmissionId || creatingAi}
          >
            {creatingAi ? "Starting..." : "vs AI"}
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => setShowPicker(true)}>
            Challenge a Response
          </Button>
        </div>
      </div>

      {myFights.length > 0 && <PastFights fights={myFights} onNavigate={onNavigateToThread} />}
    </div>
  );
}

function PastFights({ fights, onNavigate }: { fights: FightThread[]; onNavigate: (slug: string) => void }) {
  return (
    <Card title="Past Fights">
      <div className="space-y-2">
        {fights.map((fight) => (
          <div
            key={fight.id}
            className="flex items-center justify-between rounded-sm bg-[var(--c-surface-strong)] px-3 py-2"
          >
            <div>
              <span className="font-display text-xs font-medium text-[var(--c-ink)]">
                {fight.mode === "vs_ai" ? "vs AI" : "1v1"}
              </span>
              <Badge tone={STATUS_TONE[fight.status] ?? "neutral"} className="ml-2 text-[9px]">
                {fight.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(fight.slug)}
              className="text-[10px] text-[var(--c-link)] underline"
            >
              View
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
