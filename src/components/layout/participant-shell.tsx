import { useCallback, useRef, useState, type ReactNode } from "react";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { ParticipantContextRail } from "@/components/layout/participant-context-rail";
import { ParticipantNavRail } from "@/components/layout/participant-nav-rail";
import { ParticipantQuestionBar } from "@/components/layout/participant-question-bar";
import { ParticipantStatusBanner } from "@/components/layout/participant-status-banner";
import { ParticipantTopBar } from "@/components/layout/participant-top-bar";
import { PresenceBar } from "@/components/stream/presence-bar";
import { TABS, type TabId } from "@/lib/constants";

interface ReleasedQuestion {
  id: string;
  title: string;
  isCurrent: boolean;
}

interface StatusCapabilities {
  contributionsOpen: boolean;
  hasContributions: boolean;
  canSeeRawPeerResponses: boolean;
  canSeeCategorySummary: boolean;
  synthesisVisible: boolean;
  fightEnabled: boolean;
  personalReportsVisible: boolean;
}

export interface ParticipantShellProps {
  sessionTitle: string;
  joinCode: string;
  nickname: string;
  sessionSlug: string;
  prompt: string;
  promptLabel: string;
  capabilities: StatusCapabilities;

  releasedQuestions?: ReleasedQuestion[];
  selectedQuestionId?: string | null;
  onSelectQuestion?: (questionId: string | null) => void;

  presenceTyping?: number;
  contribute: ReactNode;
  explore: ReactNode;
  fight: ReactNode;
  me: ReactNode;
  activeTab: TabId;
  onActiveTabChange: (tab: TabId) => void;
}

export function ParticipantShell({
  sessionTitle,
  joinCode,
  nickname,
  sessionSlug,
  prompt,
  promptLabel,
  capabilities,
  releasedQuestions,
  selectedQuestionId,
  onSelectQuestion,
  presenceTyping,
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

  const tab = TABS.find((t) => t.id === activeTab);
  const [scrolled, setScrolled] = useState(false);
  const rafRef = useRef(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const top = e.currentTarget.scrollTop;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setScrolled(top > 2);
    });
  }, []);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[680px] flex-col bg-[var(--c-canvas)] shadow-sm lg:max-w-none">
      <ParticipantTopBar
        sessionTitle={sessionTitle}
        joinCode={joinCode}
        nickname={nickname}
        sessionSlug={sessionSlug}
      />

      <div className={`relative z-10 transition-shadow duration-300 lg:hidden ${scrolled ? "shadow-[0_4px_12px_color-mix(in_oklch,var(--c-ink),transparent_88%)]" : "shadow-none"}`}>
        <ParticipantQuestionBar
          prompt={prompt}
          promptLabel={promptLabel}
          releasedQuestions={releasedQuestions}
          selectedQuestionId={selectedQuestionId}
          onSelectQuestion={onSelectQuestion}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <ParticipantNavRail activeTab={activeTab} onTabChange={onActiveTabChange} />

        <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:px-6 lg:py-5" onScroll={handleScroll}>
          <div className="mx-auto w-full max-w-3xl xl:max-w-4xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--c-muted)] lg:block">
                  Participant workspace
                </p>
                <h2 className="font-display text-lg font-semibold" style={{ color: tab?.color }}>
                  {tab?.label}
                </h2>
              </div>
              {activeTab === "contribute" ? (
                <PresenceBar typing={presenceTyping} />
              ) : null}
            </div>
            <ParticipantStatusBanner activeTab={activeTab} {...capabilities} />
            <div className="mt-3">{content[activeTab]}</div>
          </div>
        </main>

        <ParticipantContextRail
          prompt={prompt}
          promptLabel={promptLabel}
          releasedQuestions={releasedQuestions}
          selectedQuestionId={selectedQuestionId}
          onSelectQuestion={onSelectQuestion}
        />
      </div>

      <BottomTabBar activeTab={activeTab} onTabChange={onActiveTabChange} className="lg:hidden" />
    </div>
  );
}
