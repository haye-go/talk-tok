import { ROOM_MODES } from "@/components/instructor/instructor-nav";
import { Link } from "@tanstack/react-router";
import { PresenceBar } from "@/components/stream/presence-bar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useInstructorRoom } from "@/hooks/use-instructor-room";
import type { InstructorRoomModeId } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { InputPattern } from "@/lib/submission-telemetry";
import { ConsensusPulseStub } from "./consensus-pulse-stub";
import { InputPatternsBar } from "./input-patterns-bar";
import { NeedsAttentionPanel } from "./needs-attention-panel";
import { RoomCategoriesBoard } from "./room-categories-board";
import { RoomSimilarityClusters } from "./room-similarity-clusters";
import { ThreadCard } from "./thread-card";

interface CategoryRef {
  id: Id<"categories">;
  name: string;
}

export interface RoomWorkspaceProps {
  sessionSlug: string;
  selectedQuestionId: Id<"sessionQuestions"> | undefined;
  roomMode: InstructorRoomModeId;
  roomModeHref: (mode: InstructorRoomModeId) => string;
  typingPresence: number;
  patternCounts: Record<InputPattern, number>;
  categories: CategoryRef[];
}

export function RoomWorkspace({
  sessionSlug,
  selectedQuestionId,
  roomMode,
  roomModeHref,
  typingPresence,
  patternCounts,
  categories,
}: RoomWorkspaceProps) {
  const room = useInstructorRoom(sessionSlug, selectedQuestionId);

  const selectedQuestion = room?.selectedQuestion;
  const latestThreads = room?.latestThreads ?? [];
  const threadsByCategory = room?.threadsByCategory ?? [];
  const uncategorizedThreads = room?.uncategorizedThreads ?? [];
  const needsAttention = room?.needsAttention;

  const headerTitle = selectedQuestion?.title ?? room?.session.title ?? "Live discussion";
  const headerPrompt = selectedQuestion?.prompt ?? room?.session.openingPrompt ?? "";
  const headerStatusLabel = selectedQuestion?.isCurrent
    ? "Current question"
    : (selectedQuestion?.status ?? room?.session.phase ?? "");

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 p-5 lg:p-7">
      <header className="rounded-2xl border border-[#c6cdd8] bg-[var(--c-question-surface)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--c-muted)]">
              Room
            </p>
            <h1 className="font-display text-2xl font-semibold text-[var(--c-ink)]">
              {headerTitle}
            </h1>
            {headerPrompt ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--c-body)]">
                {headerPrompt}
              </p>
            ) : null}
          </div>
          <Badge tone={selectedQuestion?.isCurrent ? "success" : "neutral"}>
            {headerStatusLabel}
          </Badge>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {ROOM_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <Link
                key={mode.id}
                to={roomModeHref(mode.id)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-2 rounded-sm border px-3 text-sm font-medium transition",
                  roomMode === mode.id
                    ? "border-[var(--c-primary)] bg-white text-[var(--c-ink)]"
                    : "border-transparent text-[var(--c-muted)] hover:bg-white/70 hover:text-[var(--c-ink)]",
                )}
              >
                <Icon size={15} />
                {mode.label}
              </Link>
            );
          })}
        </div>
      </header>

      <NeedsAttentionPanel
        sessionSlug={sessionSlug}
        selectedQuestionId={selectedQuestionId}
        uncategorizedCount={needsAttention?.uncategorizedCount ?? 0}
        pendingRecategorisationCount={needsAttention?.pendingRecategorisationCount ?? 0}
        failedLiveJobCount={needsAttention?.failedLiveJobCount ?? 0}
        categories={categories}
      />

      <section className="grid gap-5 lg:grid-cols-2">
        <InputPatternsBar patternCounts={patternCounts} />
        <ConsensusPulseStub />
      </section>

      <PresenceBar typing={typingPresence} />

      {roomMode === "latest" ? (
        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-medium text-[var(--c-ink)]">Latest threads</h2>
            <Badge tone="neutral">{latestThreads.length}</Badge>
          </div>
          {room === undefined ? (
            <Card>
              <p className="text-sm text-[var(--c-muted)]">Loading room threads…</p>
            </Card>
          ) : latestThreads.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--c-muted)]">No submissions yet.</p>
            </Card>
          ) : (
            latestThreads.map((thread) => (
              <ThreadCard key={thread.root.submission.id} thread={thread} />
            ))
          )}
        </section>
      ) : null}

      {roomMode === "categories" ? (
        <RoomCategoriesBoard
          categoryGroups={threadsByCategory.filter((group) => group.threads.length > 0)}
          uncategorizedThreads={uncategorizedThreads}
        />
      ) : null}

      {roomMode === "similarity" ? (
        <RoomSimilarityClusters sessionSlug={sessionSlug} selectedQuestionId={selectedQuestionId} />
      ) : null}
    </div>
  );
}
