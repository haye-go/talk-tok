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
          <Card title="Contribution Trace">Personal report placeholder.</Card>
        </div>
      }
    />
  );
}
