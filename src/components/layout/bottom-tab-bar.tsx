import { LockSimple } from "@phosphor-icons/react";
import { TABS, type TabId } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface BottomTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isTabUnlocked: (tab: TabId) => boolean;
  className?: string;
}

export function BottomTabBar({
  activeTab,
  onTabChange,
  isTabUnlocked,
  className,
}: BottomTabBarProps) {
  return (
    <nav
      className={cn(
        "grid grid-cols-4 border-t border-[var(--c-hairline)] bg-[var(--c-canvas)] pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        className,
      )}
      aria-label="Participant tabs"
    >
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        const unlocked = isTabUnlocked(tab.id);
        const Icon = unlocked ? tab.icon : LockSimple;

        return (
          <button
            key={tab.id}
            type="button"
            data-active={active ? "true" : "false"}
            disabled={!unlocked}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 border-t-2 border-transparent px-1 text-xs text-[var(--c-muted)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--c-info-border)] disabled:opacity-45",
              active && "border-[var(--c-primary)] text-[var(--c-ink)]",
            )}
          >
            <Icon size={20} weight={active ? "bold" : "regular"} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
