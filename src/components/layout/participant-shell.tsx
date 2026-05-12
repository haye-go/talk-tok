import { type ReactNode } from "react";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { type TabId } from "@/lib/constants";

export interface ParticipantShellProps {
  topBar?: ReactNode;
  questionHeader?: ReactNode;
  contribute: ReactNode;
  explore: ReactNode;
  fight: ReactNode;
  me: ReactNode;
  activeTab: TabId;
  onActiveTabChange: (tab: TabId) => void;
}

export function ParticipantShell({
  topBar,
  questionHeader,
  contribute,
  explore,
  fight,
  me,
  activeTab,
  onActiveTabChange,
}: ParticipantShellProps) {
  const content: Record<TabId, ReactNode> = {
    contribute,
    explore,
    fight,
    me,
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[680px] flex-col bg-[var(--c-canvas)] shadow-sm">
      {topBar}
      {questionHeader}
      <main className="flex-1 overflow-y-auto p-4">{content[activeTab]}</main>
      <BottomTabBar activeTab={activeTab} onTabChange={onActiveTabChange} />
    </div>
  );
}
