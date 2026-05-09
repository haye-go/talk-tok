import { ArrowsClockwise, Lightning, Megaphone } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categoryColorToTone } from "@/lib/category-colors";

interface FollowUpTarget {
  targetKind: "all" | "category";
  categoryName?: string | null;
  categoryColor?: string | null;
}

interface ActiveFollowUp {
  id: string;
  slug: string;
  title: string;
  prompt: string;
  targetMode: "all" | "categories";
  roundNumber: number;
  targets: FollowUpTarget[];
  myResponseCount: number;
}

interface ChallengeActProps {
  activeFollowUps?: ActiveFollowUp[];
  fightMeEnabled?: boolean;
  onNavigateToFightMe?: () => void;
}

export function ChallengeAct({
  activeFollowUps,
  fightMeEnabled = true,
  onNavigateToFightMe,
}: ChallengeActProps) {
  const followUps = activeFollowUps ?? [];

  return (
    <div className="space-y-3">
      {/* Follow-up prompts from instructor */}
      {followUps.length > 0
        ? followUps.map((fu) => (
            <div key={fu.id} className="rounded-md bg-[var(--c-sig-slate)] p-3.5 text-[var(--c-on-sig-dark)]">
              <p className="mb-1 font-display text-[10px]" style={{ opacity: 0.7 }}>
                <Megaphone size={12} className="mr-1 inline" />
                Follow-up · Round {fu.roundNumber}
                {fu.targetMode === "categories" && fu.targets.length > 0 && (
                  <span className="ml-2">
                    {fu.targets
                      .filter((t) => t.categoryName)
                      .map((t, i) => (
                        <Badge
                          key={i}
                          tone={categoryColorToTone(t.categoryColor)}
                          className="ml-1 text-[8px]"
                        >
                          {t.categoryName}
                        </Badge>
                      ))}
                  </span>
                )}
              </p>
              <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--c-on-sig-dark)" }}>
                &ldquo;{fu.prompt}&rdquo;
              </p>
              {fu.myResponseCount === 0 && (
                <p className="mt-2 text-[10px]" style={{ opacity: 0.7 }}>
                  You haven&rsquo;t responded to this yet.
                </p>
              )}
              {fu.myResponseCount > 0 && (
                <p className="mt-2 text-[10px]" style={{ opacity: 0.7 }}>
                  You&rsquo;ve responded ({fu.myResponseCount}).
                </p>
              )}
            </div>
          ))
        : (
            <div className="rounded-md bg-[var(--c-sig-slate)] p-3.5 text-[var(--c-on-sig-dark)]">
              <p className="mb-1 font-display text-[10px]" style={{ opacity: 0.7 }}>
                <Megaphone size={12} className="mr-1 inline" />
                Follow-up from instructor
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--c-on-sig-dark)", opacity: 0.7 }}>
                No follow-up prompts yet. The instructor may send one targeting your category.
              </p>
            </div>
          )}

      {/* Fight Me CTA */}
      {fightMeEnabled && (
        <div
          className="rounded-md bg-[var(--c-surface-soft)] p-4 text-center"
          style={{ border: "1px solid var(--c-sig-coral)" }}
        >
          <Lightning size={28} weight="fill" className="mx-auto mb-1 text-[var(--c-sig-coral)]" />
          <p className="font-display text-base font-medium text-[var(--c-sig-coral)]">Fight Me Mode</p>
          <p className="mt-1 text-xs text-[var(--c-muted)]">
            Challenge AI or another participant to a 1v1 debate
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="coral" className="flex-1" onClick={onNavigateToFightMe}>
              vs AI
            </Button>
            <Button variant="secondary" className="flex-1" onClick={onNavigateToFightMe}>
              Challenge a Response
            </Button>
          </div>
        </div>
      )}

      {/* Position shift */}
      <div className="flex items-center gap-3 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3">
        <ArrowsClockwise size={20} className="shrink-0 text-[var(--c-link)]" />
        <div>
          <p className="text-xs text-[var(--c-ink)]">Changed your mind?</p>
          <p className="text-[10px] text-[var(--c-muted)]">
            Flag a position shift and tell us what convinced you
          </p>
        </div>
      </div>
    </div>
  );
}
