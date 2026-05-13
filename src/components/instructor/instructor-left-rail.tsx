import { ChartBar, GearSix, Graph, ListBullets, SquaresFour } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type { InstructorRoomModeId, InstructorWorkspaceTabId } from "@/lib/routes";
import { cn } from "@/lib/utils";

export const INSTRUCTOR_WORKSPACE_TABS: Array<{
  id: InstructorWorkspaceTabId;
  label: string;
  icon: Icon;
  hint: string;
}> = [
  { id: "room", label: "Room", icon: ListBullets, hint: "Live" },
  { id: "setup", label: "Setup", icon: GearSix, hint: "Prepare" },
  { id: "reports", label: "Reports", icon: ChartBar, hint: "Review" },
];

export const ROOM_MODES: Array<{
  id: InstructorRoomModeId;
  label: string;
  icon: Icon;
  hint: string;
}> = [
  { id: "latest", label: "Latest", icon: ListBullets, hint: "Default" },
  { id: "categories", label: "Categories", icon: SquaresFour, hint: "Board" },
  { id: "similarity", label: "Similarity", icon: Graph, hint: "Phase 17" },
];

export interface InstructorLeftRailProps {
  sessionTitle: string;
  workspaceTab: InstructorWorkspaceTabId;
  roomMode: InstructorRoomModeId;
  workspaceHref: (tab: InstructorWorkspaceTabId) => string;
  roomModeHref: (mode: InstructorRoomModeId) => string;
}

export function InstructorLeftRail({
  sessionTitle,
  workspaceTab,
  roomMode,
  workspaceHref,
  roomModeHref,
}: InstructorLeftRailProps) {
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
            <a
              key={tab.id}
              href={workspaceHref(tab.id)}
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
            </a>
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
              <a
                key={mode.id}
                href={roomModeHref(mode.id)}
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
              </a>
            );
          })}
        </section>
      ) : null}

      <p className="mt-auto border-t border-white/10 pt-5 text-xs leading-5 text-[#8ea4bb]">
        Room is for live reading and intervention. Setup holds drafting and configuration. Reports
        holds synthesis, argument map, personal reports, and AI review surfaces.
      </p>
    </div>
  );
}
