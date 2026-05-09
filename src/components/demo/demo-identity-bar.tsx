import { ArrowLeft, ArrowsClockwise, Swap } from "@phosphor-icons/react";
import { getDemoNickname, isDemoClientKey, restoreOriginalClientKey } from "@/lib/client-identity";
import { DEMO_SESSION_SLUG } from "@/lib/constants";
import { routes } from "@/lib/routes";

interface DemoIdentityBarProps {
  sessionSlug: string;
}

export function DemoIdentityBar({ sessionSlug }: DemoIdentityBarProps) {
  if (sessionSlug !== DEMO_SESSION_SLUG || !isDemoClientKey()) return null;

  const nickname = getDemoNickname();

  function handleRestore() {
    restoreOriginalClientKey();
    window.location.reload();
  }

  return (
    <div className="flex items-center justify-between bg-[var(--c-sig-sky)] px-4 py-1.5 text-[var(--c-on-sig-dark)]">
      <div className="flex items-center gap-3">
        <a
          href={routes.home()}
          className="flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-black/10"
        >
          <ArrowLeft size={12} /> Back
        </a>
        <span className="text-xs font-medium">
          Viewing as <strong>{nickname}</strong>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={routes.demoPersonas()}
          className="flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-black/10"
        >
          <Swap size={12} /> Switch
        </a>
        <button
          type="button"
          className="flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-black/10"
          onClick={handleRestore}
        >
          <ArrowsClockwise size={12} /> Restore my identity
        </button>
      </div>
    </div>
  );
}
