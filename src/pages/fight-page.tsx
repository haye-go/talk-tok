import { ParticipantShell } from "@/components/layout/participant-shell";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function FightPage() {
  return (
    <ParticipantShell
      fightMe={
        <div className="grid gap-4">
          <Card title="Fight Me — vs AI" className="border-[var(--c-sig-coral)]">
            <p className="text-sm text-[var(--c-body)]">
              Turn-based argument placeholder. AI counterargument will appear here.
            </p>
          </Card>
          <Card title="Your rebuttal">
            <Textarea placeholder="Fire back..." />
            <Button type="button" variant="danger" className="mt-3">
              Fire Back
            </Button>
          </Card>
        </div>
      }
    />
  );
}
