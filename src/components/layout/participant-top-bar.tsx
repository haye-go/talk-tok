import { ThemeToggle } from "@/components/theme-toggle";
import { DemoIdentityControls, getDemoDisplayNickname } from "@/components/demo/demo-identity-bar";
import { Badge } from "@/components/ui/badge";

interface ParticipantTopBarProps {
  sessionTitle: string;
  joinCode: string;
  nickname: string;
  sessionSlug: string;
  showIdentity?: boolean;
}

export function ParticipantTopBar({
  sessionTitle,
  joinCode,
  nickname,
  sessionSlug,
  showIdentity = true,
}: ParticipantTopBarProps) {
  const demoNickname = getDemoDisplayNickname(sessionSlug);

  return (
    <header className="shrink-0 border-b border-[var(--c-hairline)] bg-[var(--c-topbar)]">
      <div className="flex min-h-12 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-6 w-6 shrink-0" />
          <span className="hidden font-display text-sm font-semibold text-[var(--c-ink)] lg:inline">
            TalkTok
          </span>
          <span className="mx-0.5 hidden text-[var(--c-hairline)] lg:inline" aria-hidden>
            /
          </span>
          <span className="truncate font-display text-sm font-medium text-[var(--c-ink)]">
            {sessionTitle}
          </span>
          <Badge tone="slate" className="shrink-0 text-[10px]">
            {joinCode}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {demoNickname ? (
            <>
              <DemoIdentityControls sessionSlug={sessionSlug} />
              {showIdentity ? (
                <span className="hidden text-xs text-[var(--c-muted)] sm:inline">
                  as <strong className="text-[var(--c-ink)]">{demoNickname}</strong>
                </span>
              ) : null}
            </>
          ) : showIdentity ? (
            <span className="hidden text-xs text-[var(--c-muted)] sm:inline">as {nickname}</span>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
