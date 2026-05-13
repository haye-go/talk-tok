import { useLocation, useParams } from "@tanstack/react-router";
import type { Id } from "../../convex/_generated/dataModel";
import { InstructorLeftRail } from "@/components/instructor/instructor-left-rail";
import { InstructorRightRail } from "@/components/instructor/instructor-right-rail";
import { ReportsWorkspace } from "@/components/instructor/reports/reports-workspace";
import { RoomWorkspace } from "@/components/instructor/room/room-workspace";
import { SetupWorkspace } from "@/components/instructor/setup/setup-workspace";
import { InstructorShell } from "@/components/layout/instructor-shell";
import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";
import { useInstructorOverview } from "@/hooks/use-instructor-overview";
import {
  routes,
  type InstructorRoomModeId,
  type InstructorWorkspaceTabId,
} from "@/lib/routes";
import { type InputPattern } from "@/lib/submission-telemetry";

function isInstructorWorkspaceTab(value: string | null): value is InstructorWorkspaceTabId {
  return value === "room" || value === "setup" || value === "reports";
}

function isInstructorRoomMode(value: string | null): value is InstructorRoomModeId {
  return value === "latest" || value === "categories" || value === "similarity";
}

export function InstructorSessionPage() {
  const { sessionSlug } = useParams({ from: "/instructor/session/$sessionSlug" });
  const location = useLocation();
  const searchParams = new URLSearchParams(location.searchStr);
  const workspaceTab: InstructorWorkspaceTabId = isInstructorWorkspaceTab(searchParams.get("tab"))
    ? (searchParams.get("tab") as InstructorWorkspaceTabId)
    : "room";
  const roomMode: InstructorRoomModeId = isInstructorRoomMode(searchParams.get("mode"))
    ? (searchParams.get("mode") as InstructorRoomModeId)
    : "latest";
  const selectedQuestionId =
    (searchParams.get("questionId") as Id<"sessionQuestions"> | null) ?? undefined;
  const overview = useInstructorOverview(sessionSlug, selectedQuestionId);

  if (overview === undefined) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
        <LoadingState label="Loading instructor session..." className="w-full max-w-md" />
      </main>
    );
  }

  if (overview === null) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
        <ErrorState
          title="Session not found"
          description="This instructor session URL does not match an existing session."
        />
      </main>
    );
  }

  const {
    session,
    presence,
    responses,
    categories,
    recategorisation,
    followUps,
    selectedQuestion,
  } = overview;

  const activeCategories = categories;
  const patternCounts = responses.inputPatterns as Record<InputPattern, number>;
  const joinPath = routes.join(session.joinCode);
  const joinUrl =
    typeof window === "undefined" ? joinPath : new URL(joinPath, window.location.origin).toString();

  const synthesisReleasedForQuestion = selectedQuestion?.synthesisVisible ?? false;
  const reportsReleasedForQuestion = selectedQuestion?.personalReportsVisible ?? false;
  const sessionPrivateVisibility = session.visibilityMode === "private_until_released";

  const currentQuestionParam = selectedQuestion?.id;
  const workspaceHref = (tab: InstructorWorkspaceTabId) =>
    routes.instructorSessionWorkspace(session.slug, {
      tab,
      mode: tab === "room" ? roomMode : undefined,
      questionId: currentQuestionParam,
    });
  const roomModeHref = (mode: InstructorRoomModeId) =>
    routes.instructorSessionRoom(session.slug, {
      mode,
      questionId: currentQuestionParam,
    });
  const questionHref = (questionId: Id<"sessionQuestions">) =>
    routes.instructorSessionWorkspace(session.slug, {
      tab: workspaceTab,
      mode: workspaceTab === "room" ? roomMode : undefined,
      questionId,
    });

  const categoryRefs = activeCategories.map((category) => ({ id: category.id, name: category.name }));

  let center;
  if (workspaceTab === "room") {
    center = (
      <RoomWorkspace
        sessionSlug={sessionSlug}
        selectedQuestionId={selectedQuestion?.id}
        roomMode={roomMode}
        roomModeHref={roomModeHref}
        typingPresence={presence.typing}
        patternCounts={patternCounts}
        categories={categoryRefs}
      />
    );
  } else if (workspaceTab === "reports") {
    center = (
      <ReportsWorkspace
        sessionSlug={sessionSlug}
        selectedQuestionId={selectedQuestion?.id}
        categories={categoryRefs}
        currentQuestionTitle={overview.currentQuestion?.title ?? "the current question"}
        sessionPrivateVisibility={sessionPrivateVisibility}
        synthesisReleasedForQuestion={synthesisReleasedForQuestion}
        reportsReleasedForQuestion={reportsReleasedForQuestion}
      />
    );
  } else {
    center = (
      <SetupWorkspace
        sessionSlug={sessionSlug}
        selectedQuestionId={selectedQuestion?.id}
        session={session}
        currentQuestion={overview.currentQuestion}
        selectedQuestion={selectedQuestion ?? null}
        metrics={{
          submitted: responses.total,
          categories: activeCategories.length,
          recategorisationRequests: recategorisation.pendingCount,
          followUps: followUps.activeCount,
        }}
        joinUrl={joinUrl}
        categories={activeCategories.map((category) => ({
          id: category.id,
          name: category.name,
          description: category.description,
          color: category.color,
          assignmentCount: category.assignmentCount,
        }))}
        followUps={followUps.recent.map((prompt) => ({
          id: prompt.id,
          title: prompt.title,
          prompt: prompt.prompt,
          status: prompt.status,
          targetMode: prompt.targetMode,
          activatedAt: prompt.activatedAt ?? undefined,
          closedAt: prompt.closedAt ?? undefined,
          createdAt: prompt.createdAt,
        }))}
      />
    );
  }

  return (
    <InstructorShell
      sessionTitle={session.title}
      sessionCode={session.joinCode}
      participantCount={session.participantCount}
      left={
        <InstructorLeftRail
          sessionTitle={session.title}
          workspaceTab={workspaceTab}
          roomMode={roomMode}
          workspaceHref={workspaceHref}
          roomModeHref={roomModeHref}
        />
      }
      center={center}
      right={
        <InstructorRightRail
          sessionSlug={session.slug}
          selectedQuestionId={selectedQuestion?.id}
          questionHref={questionHref}
        />
      }
    />
  );
}
