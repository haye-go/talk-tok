import { ArrowLeft, ArrowsClockwise, Swap } from "@phosphor-icons/react";
import {
  getDemoNickname,
  isDemoClientKey,
  restoreOriginalClientKey,
} from "@/lib/client-identity";
import { DEMO_SESSION_SLUG } from "@/lib/constants";
import { routes } from "@/lib/routes";

interface DemoIdentityControlsProps {
  sessionSlug: string;
}

export function DemoIdentityControls({ sessionSlug }: DemoIdentityControlsProps) {
  if (sessionSlug !== DEMO_SESSION_SLUG || !isDemoClientKey()) return null;

  function handleRestore() {
    restoreOriginalClientKey();
    window.location.reload();
  }

  return (
    <>
      <a
        href={routes.home()}
        className="flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-medium text-[var(--c-muted)] transition-colors hover:bg-[var(--c-surface-strong)] hover:text-[var(--c-ink)]"
      >
        <ArrowLeft size={12} /> Back
      </a>
      <a
        href={routes.demoPersonas()}
        className="flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-medium text-[var(--c-muted)] transition-colors hover:bg-[var(--c-surface-strong)] hover:text-[var(--c-ink)]"
      >
        <Swap size={12} /> Switch
      </a>
      <button
        type="button"
        className="flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-medium text-[var(--c-muted)] transition-colors hover:bg-[var(--c-surface-strong)] hover:text-[var(--c-ink)]"
        onClick={handleRestore}
      >
        <ArrowsClockwise size={12} /> Restore
      </button>
    </>
  );
}

export function getDemoDisplayNickname(sessionSlug: string): string | null {
  if (sessionSlug !== DEMO_SESSION_SLUG || !isDemoClientKey()) return null;
  return getDemoNickname();
}

