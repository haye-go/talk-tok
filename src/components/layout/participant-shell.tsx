import { useState, type ReactNode } from "react";
import { ActProgressBar } from "@/components/layout/act-progress-bar";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { Card } from "@/components/ui/card";
import { useAct } from "@/hooks/use-act";
import type { TabId } from "@/lib/constants";

export interface ParticipantShellProps {
  main?: ReactNode;
  stream?: ReactNode;
  fightMe?: ReactNode;
  myZone?: ReactNode;
}

export function ParticipantShell({ main, stream, fightMe, myZone }: ParticipantShellProps) {
  const { actIndex, currentAct, isTabUnlocked } = useAct();
  const [activeTab, setActiveTab] = useState<TabId>("main");

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
    <div className="mx-auto flex min-h-dvh w-full max-w-[680px] flex-col bg-[var(--c-canvas)] shadow-sm">
      <ActProgressBar actIndex={actIndex} />
      <main className="flex-1 overflow-y-auto p-4">{content[activeTab]}</main>
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isTabUnlocked={isTabUnlocked}
      />
    </div>
  );
}
