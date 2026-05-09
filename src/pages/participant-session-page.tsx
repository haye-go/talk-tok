import { ParticipantShell } from "@/components/layout/participant-shell";
import { PretextDisplay } from "@/components/text/pretext-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function ParticipantSessionPage() {
  return (
    <ParticipantShell
      main={
        <div className="grid gap-4">
          <Card
            title="Should AI be allowed to make medical diagnoses without human oversight?"
            eyebrow="Current topic"
          >
            <PretextDisplay text="Consider legal, ethical, and practical dimensions. This is placeholder content for the designer-facing shell." />
          </Card>
          <Card title="Your response">
            <Textarea label="Response" placeholder="Write your perspective..." />
            <div className="mt-3 flex items-center justify-between gap-3">
              <Badge tone="warning">Spicy tone</Badge>
              <Button type="button">Submit</Button>
            </div>
          </Card>
        </div>
      }
      stream={
        <Card title="Response Stream">
          <PretextDisplay text="Maya: Patient consent must come first...\nSam: Cost is the biggest barrier..." />
        </Card>
      }
      fightMe={<Card title="Fight Me">Fight Me entry and debate states will mount here.</Card>}
      myZone={
        <Card title="My Zone">
          Private response history, feedback, and contribution trace will mount here.
        </Card>
      }
    />
  );
}
