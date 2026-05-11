import { useState, type ReactNode } from "react";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { Card } from "@/components/ui/card";
import { type TabId } from "@/lib/constants";

export interface ParticipantShellProps {
  topBar?: ReactNode;
  questionHeader?: ReactNode;
  contribute?: ReactNode;
  explore?: ReactNode;
  fight?: ReactNode;
  me?: ReactNode;
  defaultTab?: TabId;
  activeTab?: TabId;
  onActiveTabChange?: (tab: TabId) => void;
}

export function ParticipantShell({
  topBar,
  questionHeader,
  contribute,
  explore,
  fight,
  me,
  defaultTab = "contribute",
  activeTab: controlledActiveTab,
  onActiveTabChange,
}: ParticipantShellProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<TabId>(defaultTab);
  const activeTab = controlledActiveTab ?? internalActiveTab;

  function handleTabChange(tab: TabId) {
    setInternalActiveTab(tab);
    onActiveTabChange?.(tab);
  }

  const content: Record<TabId, ReactNode> = {
    contribute: contribute ?? (
      <Card title="Contribute placeholder">Participant contribution surface goes here.</Card>
    ),
    explore: explore ?? (
      <Card title="Explore placeholder">Response stream and published class signals go here.</Card>
    ),
    fight: fight ?? (
      <Card title="Fight placeholder">Structured challenge flow goes here.</Card>
    ),
    me: me ?? (
      <Card title="Me placeholder">Private participant history and reflection go here.</Card>
    ),
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[680px] flex-col bg-[var(--c-canvas)] shadow-sm">
      {topBar}
      {questionHeader}
      <main className="flex-1 overflow-y-auto p-4">{content[activeTab]}</main>
      <BottomTabBar activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
