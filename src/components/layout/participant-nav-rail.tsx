import { TABS, type TabId } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ParticipantNavRailProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function ParticipantNavRail({
  activeTab,
  onTabChange,
}: ParticipantNavRailProps) {
  return (
    <nav
      className="hidden w-[200px] shrink-0 flex-col border-r border-[var(--c-hairline)] bg-[var(--c-surface-soft)] lg:flex"
      aria-label="Participant tabs"
    >
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-sm border-l-2 px-3 py-2.5 text-sm transition",
                active
                  ? "bg-[var(--c-surface-strong)] font-medium"
                  : "border-transparent text-[var(--c-muted)] hover:bg-[var(--c-surface-strong)] hover:text-[var(--c-ink)]",
              )}
              style={active ? { borderColor: tab.color, color: tab.color } : undefined}
            >
              <Icon size={20} weight={active ? "bold" : "regular"} />
              <span className="font-display">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
