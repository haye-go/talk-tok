import { useState } from "react";
import { ChatCircleText, SquaresFour, Sword, TextAlignLeft } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import {
  ParticipantThreadAction,
  ParticipantThreadCard,
} from "@/components/messages/participant-thread-card";
import { ReactionBar } from "@/components/reactions/reaction-bar";
import {
  ResponseComposer,
  type ResponseComposerSubmit,
} from "@/components/submission/response-composer";
import { SynthesisArtifactCard } from "@/components/synthesis/synthesis-artifact-card";
import { ParticipantStateSection } from "@/components/layout/participant-state-section";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { categoryColorToTone } from "@/lib/category-colors";
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

interface ThreadSubmission {
  id: Id<"submissions">;
  nickname: string;
  body: string;
  kind: "initial" | "additional_point" | "reply" | "fight_me_turn";
  createdAt: number;
}

interface ThreadMessage {
  submission: ThreadSubmission;
  stats: {
    replyCount: number;
    upvoteCount: number;
    reactionCounts: Record<string, number>;
  };
  viewerState: {
    isOwn: boolean;
    hasUpvoted: boolean;
    myReactions: string[];
  };
}

interface PeerThread {
  root: ThreadMessage;
  replies: ThreadMessage[];
  assignment: {
    categoryId: Id<"categories">;
    categoryName?: string | null;
    categoryColor?: string | null;
  } | null;
}

interface PeerThreadCategorySection {
  category: CategorySummary | null;
  threadCount: number;
  threads: PeerThread[];
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

interface SynthesisView {
  visible: boolean;
  artifacts: SynthesisArtifact[];
  classArtifacts: SynthesisArtifact[];
  categorySections: Array<{
    category: CategorySummary;
    artifactCount: number;
    artifacts: SynthesisArtifact[];
  }>;
}

interface StreamTabProps {
  peerResponses?: PeerResponse[];
  peerThreads?: PeerThread[];
  peerThreadsByCategory?: PeerThreadCategorySection[];
  categories?: CategorySummary[];
  synthesisArtifacts?: SynthesisArtifact[];
  synthesisView?: SynthesisView;
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

type RoomMode = "latest" | "category" | "synthesis";

function threadFromPeerResponse(response: PeerResponse): PeerThread {
  return {
    root: {
      submission: {
        id: response.id,
        nickname: response.nickname,
        body: response.body,
        kind: "initial",
        createdAt: response.createdAt,
      },
      stats: {
        replyCount: 0,
        upvoteCount: 0,
        reactionCounts: {},
      },
      viewerState: {
        isOwn: false,
        hasUpvoted: false,
        myReactions: [],
      },
    },
    replies: [],
    assignment: response.categoryId
      ? {
          categoryId: response.categoryId,
          categoryName: response.categoryName,
          categoryColor: response.categoryColor,
        }
      : null,
  };
}

export function StreamTab({
  peerResponses,
  peerThreads,
  peerThreadsByCategory,
  categories,
  synthesisArtifacts,
  synthesisView,
  synthesisVisible = false,
  synthesisBlockedBySession = false,
  canSeeRawPeerResponses = true,
  canSeeCategorySummary = true,
  repliesEnabled = true,
  upvotesEnabled = true,
  fightEnabled = false,
  selectedQuestionId,
  softWordLimit,
  sessionSlug,
  clientKey,
  mySubmissionId,
  onFightCreated,
}: StreamTabProps) {
  const [roomMode, setRoomMode] = useState<RoomMode>("latest");
  const [replyParentId, setReplyParentId] = useState<Id<"submissions"> | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [creatingFightFor, setCreatingFightFor] = useState<Id<"submissions"> | null>(null);

  const createReply = useMutation(api.submissions.create);
  const createChallenge = useMutation(api.fightMe.createChallenge);

  const cats = categories ?? [];
  const latestThreads = peerThreads ?? (peerResponses ?? []).map(threadFromPeerResponse);
  const categorySections = peerThreadsByCategory ?? [];
  const synthesisArtifactsForView = synthesisView?.artifacts ?? synthesisArtifacts ?? [];
  const synthesisAvailable =
    (synthesisView?.visible ?? synthesisVisible) &&
    !synthesisBlockedBySession &&
    synthesisArtifactsForView.length > 0;

  async function handleReply(thread: PeerThread, submission: ResponseComposerSubmit) {
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
        parentSubmissionId: thread.root.submission.id,
        telemetry: submission.telemetry,
      });
      setReplyParentId(null);
    } catch (cause) {
      setReplyError(cause instanceof Error ? cause.message : "Could not send reply.");
      throw cause;
    }
  }

  async function handleFight(thread: PeerThread) {
    const submissionId = thread.root.submission.id;

    if (!sessionSlug || !clientKey || !fightEnabled || !mySubmissionId || creatingFightFor) {
      return;
    }

    setCreatingFightFor(submissionId);
    try {
      const result = await createChallenge({
        sessionSlug,
        clientKey,
        defenderSubmissionId: submissionId,
        attackerSubmissionId: mySubmissionId,
      });
      onFightCreated?.(result.slug);
    } finally {
      setCreatingFightFor(null);
    }
  }

  function renderThread(thread: PeerThread) {
    const submission = thread.root.submission;
    const replyOpen = replyParentId === submission.id;
    const creatingFight = creatingFightFor === submission.id;

    return (
      <div key={submission.id} className="flex flex-col gap-2">
        <ParticipantThreadCard
          authorLabel={submission.nickname}
          body={submission.body}
          createdAt={submission.createdAt}
          categoryName={thread.assignment?.categoryName ?? undefined}
          categoryTone={categoryColorToTone(thread.assignment?.categoryColor)}
          stats={thread.root.stats}
          replies={thread.replies.map((reply) => ({
            id: reply.submission.id,
            authorLabel: reply.submission.nickname,
            body: reply.submission.body,
            createdAt: reply.submission.createdAt,
            isOwn: reply.viewerState.isOwn,
          }))}
          actions={
            sessionSlug && clientKey ? (
              <>
                <ParticipantThreadAction
                  disabled={!repliesEnabled}
                  onClick={() => setReplyParentId(replyOpen ? null : submission.id)}
                >
                  <ChatCircleText size={12} />
                  {replyOpen ? "Cancel reply" : "Reply"}
                </ParticipantThreadAction>
                <ParticipantThreadAction
                  disabled={!fightEnabled || !mySubmissionId || creatingFight}
                  onClick={() => void handleFight(thread)}
                >
                  <Sword size={12} />
                  {creatingFight ? "Starting..." : "Fight"}
                </ParticipantThreadAction>
                <ReactionBar
                  submissionId={submission.id}
                  sessionSlug={sessionSlug}
                  clientKey={clientKey}
                  counts={thread.root.stats.reactionCounts}
                  myReactions={thread.root.viewerState.myReactions}
                  mode="upvote"
                  variant="compact"
                  disabled={!upvotesEnabled}
                />
              </>
            ) : null
          }
        />

        {replyOpen ? (
          <Card title={`Reply to ${submission.nickname}`}>
            {replyError ? <InlineAlert tone="error">{replyError}</InlineAlert> : null}
            <ResponseComposer
              softWordLimit={softWordLimit}
              submitLabel="Send reply"
              placeholder="Respond directly to this point..."
              onSubmit={(_text, _tone, replySubmission) => handleReply(thread, replySubmission)}
            />
          </Card>
        ) : null}
      </div>
    );
  }

  function renderLatest() {
    if (latestThreads.length === 0) {
      return (
        <ParticipantStateSection kind="empty" title="Peer responses">
          No peer responses visible yet.
        </ParticipantStateSection>
      );
    }

    return <div className="flex flex-col gap-3">{latestThreads.map(renderThread)}</div>;
  }

  function renderByCategory() {
    const visibleSections = categorySections.filter((section) => section.threads.length > 0);

    if (!canSeeCategorySummary || visibleSections.length === 0) {
      return (
        <ParticipantStateSection kind="empty" title="Categories">
          No category groups are ready yet.
        </ParticipantStateSection>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {visibleSections.map((section, index) => (
          <section
            key={section.category?.id ?? "uncategorized"}
            className="rounded-lg border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              {section.category ? (
                <Badge tone={categoryColorToTone(section.category.color, index)}>
                  {section.category.name}
                </Badge>
              ) : (
                <Badge tone="neutral">Uncategorized</Badge>
              )}
              <span className="text-[11px] text-[var(--c-muted)]">
                {section.threadCount} {section.threadCount === 1 ? "message" : "messages"}
              </span>
            </div>
            <div className="flex flex-col gap-3">{section.threads.map(renderThread)}</div>
          </section>
        ))}
      </div>
    );
  }

  function renderSynthesis() {
    if (!synthesisAvailable) {
      return (
        <ParticipantStateSection kind="empty" title="Synthesis">
          Class synthesis is not available for this question yet.
        </ParticipantStateSection>
      );
    }

    return (
      <Card title="Class synthesis">
        <div className="flex flex-col gap-2">
          {synthesisArtifactsForView.map((artifact) => (
            <SynthesisArtifactCard
              key={artifact.id}
              artifact={artifact}
              sessionSlug={sessionSlug ?? ""}
            />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--c-muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            {latestThreads.length} {latestThreads.length === 1 ? "message" : "messages"}
          </span>
          {cats.length > 0 ? (
            <span>
              {cats.length} {cats.length === 1 ? "category" : "categories"}
            </span>
          ) : null}
          {synthesisAvailable ? <Badge tone="sky">Synthesis ready</Badge> : null}
        </div>
        <div className="flex rounded-pill border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-0.5">
          {(
            [
              ["latest", TextAlignLeft, "Latest"],
              ["category", SquaresFour, "By category"],
              ["synthesis", TextAlignLeft, "Synthesis"],
            ] as const
          ).map(([mode, Icon, label]) => (
            <button
              key={mode}
              type="button"
              disabled={mode === "synthesis" && !synthesisAvailable}
              onClick={() => setRoomMode(mode)}
              className={cn(
                "inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-pill px-2 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                roomMode === mode
                  ? "bg-[var(--c-primary)] text-[var(--c-on-primary)]"
                  : "text-[var(--c-muted)] hover:bg-[var(--c-surface-strong)] hover:text-[var(--c-ink)]",
              )}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {canSeeRawPeerResponses &&
      (!repliesEnabled || !upvotesEnabled || (fightEnabled && !mySubmissionId)) ? (
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

      {!canSeeRawPeerResponses ? (
        <ParticipantStateSection kind="hidden" title="Peer responses">
          Peer responses remain private until the instructor releases them.
        </ParticipantStateSection>
      ) : roomMode === "category" ? (
        renderByCategory()
      ) : roomMode === "synthesis" ? (
        renderSynthesis()
      ) : (
        renderLatest()
      )}
    </div>
  );
}
