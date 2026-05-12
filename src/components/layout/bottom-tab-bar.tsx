import { TABS, type TabId } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface BottomTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  className?: string;
}

export function BottomTabBar({
  activeTab,
  onTabChange,
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
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            data-active={active ? "true" : "false"}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 border-t-2 px-1 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--c-info-border)]",
              active
                ? "font-medium"
                : "border-transparent text-[var(--c-muted)]",
            )}
            style={active ? { borderColor: tab.color, color: tab.color } : undefined}
          >
            <Icon size={20} weight={active ? "bold" : "regular"} />
            <span className="font-display">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
