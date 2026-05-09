import { QRCodeSVG } from "qrcode.react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ProjectorShell } from "@/components/layout/projector-shell";
import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";
import { routes } from "@/lib/routes";

export function ProjectorPage() {
  const { sessionSlug } = useParams({ from: "/instructor/session/$sessionSlug/projector" });
  const session = useQuery(api.sessions.getBySlug, { sessionSlug });

  if (session === undefined) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
        <LoadingState label="Loading projector..." className="w-full max-w-md" />
      </main>
    );
  }

  if (session === null) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
        <ErrorState
          title="Session not found"
          description="This projector URL does not match an existing session."
        />
      </main>
    );
  }

  const joinPath = routes.join(session.joinCode);
  const joinUrl =
    typeof window === "undefined" ? joinPath : new URL(joinPath, window.location.origin).toString();

  return (
    <ProjectorShell
      sessionTitle={session.title}
      joinCode={session.joinCode}
      joinUrl={joinUrl}
      currentAct={session.currentAct}
      qrCode={<QRCodeSVG value={joinUrl} size={220} />}
    />
  );
}
