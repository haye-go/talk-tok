import { useState } from "react";
import { Presentation } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { routes, type InstructorRoomModeId, type InstructorWorkspaceTabId } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { INSTRUCTOR_WORKSPACE_TABS, ROOM_MODES } from "./instructor-nav";

export interface InstructorLeftRailProps {
  sessionSlug: string;
  sessionTitle: string;
  joinCode: string;
  workspaceTab: InstructorWorkspaceTabId;
  roomMode: InstructorRoomModeId;
  workspaceHref: (tab: InstructorWorkspaceTabId) => string;
  roomModeHref: (mode: InstructorRoomModeId) => string;
}

export function InstructorLeftRail({
  sessionSlug,
  sessionTitle,
  joinCode,
  workspaceTab,
  roomMode,
  workspaceHref,
  roomModeHref,
}: InstructorLeftRailProps) {
  const [urlCopied, setUrlCopied] = useState(false);

  const joinPath = routes.join(joinCode);
  const joinUrl =
    typeof window === "undefined" ? joinPath : new URL(joinPath, window.location.origin).toString();

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      // clipboard may be blocked
    }
  }
  return (
    <div className="flex min-h-full flex-col gap-6 bg-gradient-to-b from-[#18324c] to-[#12263a] p-5 text-[#d9e7f3]">
      <section className="border-b border-white/10 pb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b8cadb]">
          Session
        </p>
        <h2 className="mt-2 font-display text-base font-semibold text-white">{sessionTitle}</h2>
        <p className="mt-2 text-xs leading-5 text-[#8ea4bb]">
          Entry links stay intentional: Open Room for live use, Open Setup for preparation.
        </p>
      </section>

      <nav className="grid gap-2">
        {INSTRUCTOR_WORKSPACE_TABS.map((tab) => {
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              to={workspaceHref(tab.id)}
              className={cn(
                "inline-flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 text-sm font-semibold transition",
                workspaceTab === tab.id
                  ? "bg-white/12 text-white"
                  : "text-[#b8cadb] hover:bg-white/8 hover:text-white",
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Icon size={16} />
                {tab.label}
              </span>
              <span className="text-[11px] font-semibold text-[#8ea4bb]">{tab.hint}</span>
            </Link>
          );
        })}
      </nav>

      {workspaceTab === "room" ? (
        <section className="grid gap-2 border-t border-white/10 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b8cadb]">
            Room Modes
          </p>
          {ROOM_MODES.map((mode) => {
            const Icon = mode.icon;

            return (
              <Link
                key={mode.id}
                to={roomModeHref(mode.id)}
                className={cn(
                  "inline-flex min-h-10 items-center justify-between gap-3 rounded-xl px-3 text-sm font-semibold transition",
                  roomMode === mode.id
                    ? "bg-white/12 text-white"
                    : "text-[#b8cadb] hover:bg-white/8 hover:text-white",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon size={15} />
                  {mode.label}
                </span>
                <span className="text-[11px] font-semibold text-[#8ea4bb]">{mode.hint}</span>
              </Link>
            );
          })}
        </section>
      ) : null}

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b8cadb]">
          Join Access
        </p>
        <div className="mt-3 flex justify-center rounded-md bg-white p-3">
          <QRCodeSVG value={joinUrl} size={110} />
        </div>
        <p className="mt-3 break-all text-center font-mono text-[10px] leading-4 text-[#8ea4bb]">
          {joinUrl}
        </p>
        <div className="mt-3 grid gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="w-full justify-center text-[#b8cadb] hover:text-white"
            onClick={() => void handleCopyUrl()}
          >
            {urlCopied ? "URL copied!" : "Copy URL"}
          </Button>
        </div>
        <Link
          to={routes.instructorProjector(sessionSlug)}
          className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold text-[#d9e7f3] transition hover:bg-white/10 hover:text-white"
        >
          <Presentation size={15} />
          Open projector
        </Link>
      </section>
    </div>
  );
}
