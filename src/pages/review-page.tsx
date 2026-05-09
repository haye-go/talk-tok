import { ParticipantShell } from "@/components/layout/participant-shell";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";

export function ReviewPage() {
  return (
    <ParticipantShell
      myZone={
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile label="Participation" value="Active" />
            <MetricTile label="Reasoning" value="Strong" />
            <MetricTile label="Originality" value="Above Avg" />
          </div>

          <Card title="Contribution Trace">
            <p className="text-xs leading-relaxed text-[var(--c-body)]">
              Your liability/insurance gap argument was incorporated into the &ldquo;Liability &amp;
              Law&rdquo; category synthesis as a key unique insight. 2 classmates cited related
              points in their follow-ups.
            </p>
          </Card>

          <Card title="Argument Evolution">
            <p className="text-xs leading-relaxed text-[var(--c-body)]">
              You started focused on liability (Round 1), then expanded to insurance market
              implications (follow-up). Your Fight Me debrief pushed you toward the transparency
              angle.
            </p>
          </Card>

          <div className="rounded-md bg-[var(--c-sig-cream)] p-3.5">
            <p className="font-display text-xs font-semibold text-[var(--c-sig-mustard)]">
              Growth Opportunity
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--c-on-sig-light-body)]">
              Consider engaging more with opposing categories — you stayed within Liability &amp;
              Law throughout. The Patient Autonomy group raised points that could strengthen your
              position.
            </p>
          </div>
        </div>
      }
    />
  );
}
