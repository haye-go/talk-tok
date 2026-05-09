import { Swords } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FightBubble } from "@/components/fight/fight-bubble";
import { FightCountdown } from "@/components/fight/fight-countdown";
import { FightDebrief } from "@/components/fight/fight-debrief";
import { FightDraftComposer } from "@/components/fight/fight-draft-composer";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/state/loading-state";
import { ErrorState } from "@/components/state/error-state";
import { MOCK_DEBRIEF, MOCK_FIGHT_ME_TURNS } from "@/lib/mock-data";

interface FightThreadProps {
  sessionSlug?: string;
  fightSlug?: string;
  clientKey?: string;
  myParticipantId?: string;
}

export function FightThread({
  sessionSlug,
  fightSlug,
  clientKey,
  myParticipantId,
}: FightThreadProps) {
  const thread = useQuery(
    api.fightMe.getThread,
    sessionSlug && fightSlug
      ? { sessionSlug, fightSlug, clientKey: clientKey ?? undefined }
      : "skip",
  );

  if (!sessionSlug || !fightSlug) {
    return <MockFightThread />;
  }

  if (thread === undefined) {
    return <LoadingState label="Loading fight thread..." />;
  }

  if (thread === null) {
    return <ErrorState title="Fight not found" description="This fight thread does not exist." />;
  }

  const isCompleted = thread.status === "completed" || thread.status === "timed_out" || thread.status === "forfeited";
  const isPending = thread.status === "pending_acceptance";
  const isActive = thread.status === "active";
  const isMyTurn = isActive && thread.currentTurnParticipantId === myParticipantId;
  const modeLabel = thread.mode === "vs_ai" ? "vs AI" : "1v1";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between bg-[var(--c-sig-coral)] px-4 py-2.5 text-[var(--c-on-sig-dark)]">
        <span className="font-display text-sm font-semibold">
          <Swords size={14} className="mr-1 inline" /> FIGHT ME — {modeLabel}
        </span>
        <div className="flex items-center gap-2">
          <Badge tone={isPending ? "warning" : isActive ? "sky" : "success"} className="text-[9px]">
            {thread.status.replace(/_/g, " ")}
          </Badge>
          <span className="text-[11px]" style={{ opacity: 0.8 }}>
            Turn {thread.turns.length}/{thread.maxTurns}
          </span>
        </div>
      </div>

      {/* Pending acceptance */}
      {isPending && thread.acceptanceDeadlineAt && (
        <div className="border-b border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3 text-center">
          <p className="text-xs text-[var(--c-muted)]">Waiting for opponent to accept...</p>
          <FightCountdown deadlineAt={thread.acceptanceDeadlineAt} label="Expires in:" className="mt-1 justify-center" />
        </div>
      )}

      {/* Context: attacker/defender submissions */}
      {(thread.attackerSubmission || thread.defenderSubmission) && (
        <div className="border-b border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3">
          {thread.attackerSubmission && (
            <div className="mb-2">
              <p className="text-[10px] text-[var(--c-muted)]">
                {thread.attacker?.nickname ?? "Attacker"}'s position:
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--c-body)]">
                {thread.attackerSubmission.body.length > 100
                  ? `${thread.attackerSubmission.body.slice(0, 100)}...`
                  : thread.attackerSubmission.body}
              </p>
            </div>
          )}
          {thread.defenderSubmission && (
            <div>
              <p className="text-[10px] text-[var(--c-muted)]">
                {thread.defender?.nickname ?? "Defender"}'s position:
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--c-body)]">
                {thread.defenderSubmission.body.length > 100
                  ? `${thread.defenderSubmission.body.slice(0, 100)}...`
                  : thread.defenderSubmission.body}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Turns */}
      <div className="space-y-2.5 p-3">
        {thread.turns.map((turn) => (
          <FightBubble
            key={turn.id}
            role={turn.role}
            body={turn.body}
            turnNumber={turn.turnNumber}
            status={turn.status}
            source={turn.source}
            nickname={
              turn.role === "ai"
                ? "AI"
                : turn.participantId === thread.attacker?.id
                  ? thread.attacker?.nickname
                  : thread.defender?.nickname
            }
            isMe={turn.participantId === myParticipantId}
          />
        ))}
      </div>

      {/* Composer for active turns */}
      {isActive && clientKey && sessionSlug && fightSlug && (
        <div className="p-3">
          <FightDraftComposer
            sessionSlug={sessionSlug}
            fightSlug={fightSlug}
            clientKey={clientKey}
            isMyTurn={isMyTurn}
            turnDeadlineAt={thread.turnDeadlineAt ?? undefined}
            existingDraft={thread.myDraft?.body}
            placeholder={isMyTurn ? "Your rebuttal..." : "Waiting for opponent's turn..."}
          />
        </div>
      )}

      {/* Pending with draft area */}
      {isPending && clientKey && sessionSlug && fightSlug && (
        <div className="p-3">
          <FightDraftComposer
            sessionSlug={sessionSlug}
            fightSlug={fightSlug}
            clientKey={clientKey}
            isMyTurn={false}
            existingDraft={thread.myDraft?.body}
            placeholder="Draft your opening attack while waiting..."
          />
        </div>
      )}

      {/* Debrief */}
      {isCompleted && thread.debrief && (
        <div className="p-3">
          <div className="mb-3 text-center">
            <p className="font-display text-base font-medium text-[var(--c-ink)]">
              <Swords size={16} className="mr-1 inline" /> Fight Complete!
            </p>
          </div>
          <FightDebrief
            status={thread.debrief.status}
            summary={thread.debrief.summary}
            attackerStrength={thread.debrief.attackerStrength}
            defenderStrength={thread.debrief.defenderStrength}
            strongerRebuttal={thread.debrief.strongerRebuttal}
            nextPractice={thread.debrief.nextPractice}
            error={thread.debrief.error}
          />
        </div>
      )}
    </div>
  );
}

function MockFightThread() {
  return (
    <div>
      <div className="flex items-center justify-between bg-[var(--c-sig-coral)] px-4 py-2.5 text-[var(--c-on-sig-dark)]">
        <span className="font-display text-sm font-semibold">
          <Swords size={14} className="mr-1 inline" /> FIGHT ME — vs AI
        </span>
        <span className="text-[11px]" style={{ opacity: 0.8 }}>Preview</span>
      </div>
      <div className="space-y-2.5 p-3">
        {MOCK_FIGHT_ME_TURNS.map((turn, i) => (
          <FightBubble
            key={i}
            role={turn.role === "student" ? "attacker" : "ai"}
            body={turn.text}
            turnNumber={i + 1}
            isMe={turn.role === "student"}
          />
        ))}
      </div>
    </div>
  );
}
