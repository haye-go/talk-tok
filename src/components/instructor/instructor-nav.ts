import { ChartBar, GearSix, Graph, ListBullets, SquaresFour } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type { InstructorRoomModeId, InstructorWorkspaceTabId } from "@/lib/routes";

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
