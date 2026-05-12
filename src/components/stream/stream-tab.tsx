import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { ReactionBar } from "@/components/reactions/reaction-bar";
import {
  ResponseComposer,
  type ResponseComposerSubmit,
} from "@/components/submission/response-composer";
import { SynthesisArtifactCard } from "@/components/synthesis/synthesis-artifact-card";
import { ParticipantStateSection } from "@/components/layout/participant-state-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { PresenceBar } from "@/components/stream/presence-bar";
import { ResponseStreamItem } from "@/components/stream/response-stream-item";
import { categoryColorToTone } from "@/lib/category-colors";
import { DEMO_SESSION_SLUG } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface PeerResponse {
  id: Id<"submissions">;
  questionId?: Id<"sessionQuestions">;
  nickname: string;
  body: string;
  inputPattern: string;
  categoryId?: Id<"categories"> | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  createdAt: number;
}

interface CategorySummary {
  id: Id<"categories">;
  name: string;
  color?: string | null;
  assignmentCount: number;
}

interface SynthesisArtifact {
  id: Id<"synthesisArtifacts">;
  categoryId?: Id<"categories"> | null;
  kind: string;
  status: string;
  title: string;
  summary?: string | null;
  keyPoints?: string[];
  uniqueInsights?: string[];
  opposingViews?: string[];
  generatedAt?: number | null;
  publishedAt?: number | null;
}

interface StreamTabProps {
  peerResponses?: PeerResponse[];
  categories?: CategorySummary[];
  synthesisArtifacts?: SynthesisArtifact[];
  synthesisVisible?: boolean;
  synthesisBlockedBySession?: boolean;
  canSeeRawPeerResponses?: boolean;
  canSeeCategorySummary?: boolean;
  repliesEnabled?: boolean;
  upvotesEnabled?: boolean;
  fightEnabled?: boolean;
  selectedQuestionId?: Id<"sessionQuestions">;
  softWordLimit?: number;
  presenceTyping?: number;
  presenceSubmitted?: number;
  presenceIdle?: number;
  sessionSlug?: string;
  clientKey?: string;
  mySubmissionId?: Id<"submissions">;
  onFightCreated?: (fightSlug: string) => void;
}

export function StreamTab({
  peerResponses,
  categories,
  synthesisArtifacts,
  synthesisVisible = false,
  synthesisBlockedBySession = false,
  canSeeRawPeerResponses = true,
  canSeeCategorySummary = true,
  repliesEnabled = true,
  upvotesEnabled = true,
  fightEnabled = false,
  selectedQuestionId,
  softWordLimit,
  presenceTyping = 0,
  presenceSubmitted = 0,
  presenceIdle = 0,
  sessionSlug,
  clientKey,
  mySubmissionId,
  onFightCreated,
}: StreamTabProps) {
  const [filter, setFilter] = useState<Id<"categories"> | null>(null);
  const [replyParentId, setReplyParentId] = useState<Id<"submissions"> | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [creatingFightFor, setCreatingFightFor] = useState<Id<"submissions"> | null>(null);

  const createReply = useMutation(api.submissions.create);
  const createChallenge = useMutation(api.fightMe.createChallenge);

  const cats = categories ?? [];
  const responses: PeerResponse[] = peerResponses ?? [];
  const artifacts = synthesisArtifacts ?? [];
  const submissionIds = responses.map((response) => response.id);
  const reactionState = useQuery(
    api.reactions.listForSubmissions,
    sessionSlug && submissionIds.length > 0
      ? { sessionSlug, submissionIds, clientKey: clientKey ?? undefined }
      : "skip",
  );

  const reactionsBySubmissionId = useMemo(
    () => new Map((reactionState ?? []).map((row) => [row.submissionId, row] as const)),
    [reactionState],
  );
  const isDemoMode = sessionSlug === DEMO_SESSION_SLUG && clientKey?.startsWith("demo-");

  const filtered = filter
    ? responses.filter((response) => response.categoryId === filter)
    : responses;

  async function handleReply(response: PeerResponse, submission: ResponseComposerSubmit) {
    if (!sessionSlug || !clientKey) {
      return;
    }

    setReplyError(null);
    try {
      await createReply({
        sessionSlug,
        clientKey,
        body: submission.body,
        questionId: selectedQuestionId,
        kind: "reply",
        parentSubmissionId: response.id,
        telemetry: submission.telemetry,
      });
      setReplyParentId(null);
    } catch (cause) {
      setReplyError(cause instanceof Error ? cause.message : "Could not send reply.");
      throw cause;
    }
  }

  async function handleFight(response: PeerResponse) {
    if (!sessionSlug || !clientKey || !fightEnabled || !mySubmissionId || creatingFightFor) {
      return;
    }

    setCreatingFightFor(response.id);
    try {
      const result = await createChallenge({
        sessionSlug,
        clientKey,
        defenderSubmissionId: response.id,
        attackerSubmissionId: mySubmissionId,
      });
      onFightCreated?.(result.slug);
    } finally {
      setCreatingFightFor(null);
    }
  }

  return (
    <div className="space-y-3">
      <PresenceBar typing={presenceTyping} submitted={presenceSubmitted} idle={presenceIdle} />

      {canSeeCategorySummary && cats.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilter(null)}
            className={cn(
              "shrink-0 cursor-pointer rounded-pill px-2.5 py-1 text-[10px] font-medium transition-colors",
              !filter
                ? "bg-[var(--c-primary)] text-[var(--c-on-primary)]"
                : "bg-[var(--c-surface-strong)] text-[var(--c-muted)]",
            )}
          >
            All
          </button>
          {cats.map((category, index) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setFilter(filter === category.id ? null : category.id)}
              className="shrink-0 cursor-pointer"
            >
              <Badge
                tone={categoryColorToTone(category.color, index)}
                className={cn(
                  "cursor-pointer transition-opacity",
                  filter && filter !== category.id && "opacity-40",
                )}
              >
                {category.name}
              </Badge>
            </button>
          ))}
        </div>
      ) : null}

      {canSeeRawPeerResponses && (!repliesEnabled || !upvotesEnabled || (fightEnabled && !mySubmissionId)) ? (
        <Card>
          <div className="grid gap-1 text-xs text-[var(--c-muted)]">
            {!repliesEnabled ? <p>Replies are paused for this question.</p> : null}
            {!upvotesEnabled ? <p>Upvotes are paused for this question.</p> : null}
            {fightEnabled && !mySubmissionId ? (
              <p>Submit your own contribution before you challenge a response.</p>
            ) : null}
          </div>
        </Card>
      ) : null}

      {!synthesisVisible ? (
        <ParticipantStateSection kind="waiting" title="Class synthesis">
          The instructor has not released synthesis for this question yet.
        </ParticipantStateSection>
      ) : synthesisBlockedBySession ? (
        <ParticipantStateSection kind="locked" title="Class synthesis">
          Synthesis is released for this question, but the session is still in private visibility.
        </ParticipantStateSection>
      ) : artifacts.length === 0 ? (
        <ParticipantStateSection kind="empty" title="Class synthesis">
          No synthesis has been generated for this question yet.
        </ParticipantStateSection>
      ) : (
        <Card title="Class synthesis">
          <div className="space-y-2">
            {artifacts.map((artifact) => (
              <SynthesisArtifactCard key={artifact.id} artifact={artifact} sessionSlug={sessionSlug ?? ""} />
            ))}
          </div>
        </Card>
      )}

      {!canSeeRawPeerResponses ? (
        <ParticipantStateSection kind="hidden" title="Peer responses">
          Peer responses remain private until the instructor releases them.
        </ParticipantStateSection>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <ParticipantStateSection kind="empty" title="Peer responses">
              No peer responses visible yet.
            </ParticipantStateSection>
          ) : null}

          {filtered.map((response) => {
            const reaction = reactionsBySubmissionId.get(response.id);
            const replyOpen = replyParentId === response.id;
            const creatingFight = creatingFightFor === response.id;

            return (
              <div key={response.id} className="space-y-2">
                {isDemoMode ? (
                  <p className="text-[9px] font-medium text-[var(--c-sig-sky)]">
                    {response.nickname}&apos;s response
                  </p>
                ) : null}

                <ResponseStreamItem
                  nickname={response.nickname}
                  text={response.body}
                  categoryColor={categoryColorToTone(response.categoryColor)}
                  categoryName={response.categoryName ?? undefined}
                  originality={response.inputPattern === "likely_pasted" ? "med" : "high"}
                  telemetryLabel={
                    response.inputPattern === "likely_pasted"
                      ? "Likely pasted"
                      : "Composed gradually"
                  }
                  telemetryWarning={response.inputPattern === "likely_pasted"}
                />

                {sessionSlug && clientKey ? (
                  <div className="flex flex-wrap items-center gap-2 pl-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!repliesEnabled}
                      onClick={() => setReplyParentId(replyOpen ? null : response.id)}
                    >
                      {replyOpen ? "Cancel reply" : "Reply"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!fightEnabled || !mySubmissionId || creatingFight}
                      onClick={() => void handleFight(response)}
                    >
                      {creatingFight ? "Starting..." : "Fight"}
                    </Button>
                    <ReactionBar
                      submissionId={response.id}
                      sessionSlug={sessionSlug}
                      clientKey={clientKey}
                      counts={reaction?.counts}
                      myReactions={reaction?.myReactions}
                      mode="upvote"
                      disabled={!upvotesEnabled}
                    />
                  </div>
                ) : null}

                {replyOpen ? (
                  <Card title={`Reply to ${response.nickname}`}>
                    {replyError ? <InlineAlert tone="error">{replyError}</InlineAlert> : null}
                    <ResponseComposer
                      softWordLimit={softWordLimit}
                      submitLabel="Send reply"
                      placeholder="Respond directly to this point..."
                      onSubmit={(_text, _tone, submission) => handleReply(response, submission)}
                    />
                  </Card>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
