import type { TabId } from "@/lib/constants";

interface ParticipantStatusBannerProps {
  activeTab: TabId;
  contributionsOpen: boolean;
  hasContributions: boolean;
  canSeeRawPeerResponses: boolean;
  canSeeCategorySummary: boolean;
  synthesisVisible: boolean;
  fightEnabled: boolean;
  personalReportsVisible: boolean;
}

export function ParticipantStatusBanner({
  activeTab,
  contributionsOpen,
  hasContributions,
  canSeeRawPeerResponses,
  fightEnabled,
  personalReportsVisible,
  synthesisVisible,
}: ParticipantStatusBannerProps) {
  const message = deriveStatusMessage({
    activeTab,
    contributionsOpen,
    hasContributions,
    canSeeRawPeerResponses,
    fightEnabled,
    personalReportsVisible,
    synthesisVisible,
  });

  if (!message) return null;

  return (
    <p className="px-1 py-1 text-xs text-[var(--c-muted)]">
      {message}
    </p>
  );
}

function deriveStatusMessage({
  activeTab,
  contributionsOpen,
  hasContributions,
  canSeeRawPeerResponses,
  fightEnabled,
  personalReportsVisible,
  synthesisVisible,
}: {
  activeTab: TabId;
  contributionsOpen: boolean;
  hasContributions: boolean;
  canSeeRawPeerResponses: boolean;
  fightEnabled: boolean;
  personalReportsVisible: boolean;
  synthesisVisible: boolean;
}): string | null {
  switch (activeTab) {
    case "contribute":
      if (!contributionsOpen) return "Contributions are paused";
      return null;

    case "explore":
      if (synthesisVisible) return null;
      if (!canSeeRawPeerResponses) return "Peer responses are not released yet";
      return null;

    case "fight":
      if (!fightEnabled) return "Fight is not enabled for this question";
      if (!hasContributions) return "Fight unlocks after your first contribution";
      return null;

    case "me":
      if (!personalReportsVisible) return "Your personal report is not released yet";
      return null;

    default:
      return null;
  }
}
