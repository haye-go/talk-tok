import { useState, type ReactNode } from "react";
import { ActProgressBar } from "@/components/layout/act-progress-bar";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { Card } from "@/components/ui/card";
import { getActIndex, isTabUnlockedForAct } from "@/lib/act-state";
import { ACTS, type ActId, type TabId } from "@/lib/constants";

export interface ParticipantShellProps {
  topBar?: ReactNode;
  main?: ReactNode;
  stream?: ReactNode;
  fightMe?: ReactNode;
  myZone?: ReactNode;
  currentActId?: ActId;
  defaultTab?: TabId;
  activeTab?: TabId;
  onActiveTabChange?: (tab: TabId) => void;
  unlockAllTabs?: boolean;
  canSelectActs?: boolean;
  onActChange?: (actId: ActId) => void;
}

export function ParticipantShell({
  topBar,
  main,
  stream,
  fightMe,
  myZone,
  currentActId = "submit",
  defaultTab = "main",
  activeTab: controlledActiveTab,
  onActiveTabChange,
  unlockAllTabs = false,
  canSelectActs = false,
  onActChange,
}: ParticipantShellProps) {
  const actIndex = getActIndex(currentActId);
  const currentAct = ACTS[actIndex];
  const [internalActiveTab, setInternalActiveTab] = useState<TabId>(defaultTab);
  const activeTab = controlledActiveTab ?? internalActiveTab;

  function handleTabChange(tab: TabId) {
    setInternalActiveTab(tab);
    onActiveTabChange?.(tab);
  }

  const content: Record<TabId, ReactNode> = {
    main: main ?? (
      <Card title={`${currentAct.label} placeholder`}>
        Current act surface for participant work.
      </Card>
    ),
    stream: stream ?? (
      <Card title="Stream placeholder">Response stream and published class signals go here.</Card>
    ),
    "fight-me": fightMe ?? (
      <Card title="Fight Me placeholder">Structured challenge flow goes here.</Card>
    ),
    "my-zone": myZone ?? (
      <Card title="My Zone placeholder">Private participant history and reflection go here.</Card>
    ),
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[680px] flex-col bg-[var(--c-canvas)] shadow-sm">
      {topBar}
      <ActProgressBar actIndex={actIndex} selectable={canSelectActs} onActSelect={onActChange} />
      <main className="flex-1 overflow-y-auto p-4">{content[activeTab]}</main>
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isTabUnlocked={(tab) => unlockAllTabs || isTabUnlockedForAct(currentActId, tab)}
      />
    </div>
  );
}
