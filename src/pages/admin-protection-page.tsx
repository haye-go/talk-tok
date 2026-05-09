import { AdminShell } from "@/components/layout/admin-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function AdminProtectionPage() {
  return (
    <AdminShell
      title="Protection"
      description="Rate limits, moderation, telemetry, and budget guardrails."
    >
      <div className="grid gap-4">
        <Card title="Rate Limits" eyebrow="Participant">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Submissions / minute" type="number" defaultValue="3" />
            <Input label="Follow-up replies / minute" type="number" defaultValue="5" />
            <Input label="Reactions / minute" type="number" defaultValue="10" />
            <Input label="Recat cooldown (seconds)" type="number" defaultValue="60" />
          </div>
        </Card>

        <Card title="Fight Me Limits">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Active threads per participant" type="number" defaultValue="1" />
            <Input label="Turns per thread" type="number" defaultValue="3" />
          </div>
        </Card>

        <Card title="Moderation">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--c-ink)]">Auto-moderate submissions</p>
                <p className="text-xs text-[var(--c-muted)]">
                  Flag obviously abusive content before publication
                </p>
              </div>
              <Switch checked={true} onCheckedChange={() => {}} label="" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--c-ink)]">Filter AI outputs</p>
                <p className="text-xs text-[var(--c-muted)]">
                  Check Fight Me and roast-mode replies for safety
                </p>
              </div>
              <Switch checked={true} onCheckedChange={() => {}} label="" />
            </div>
          </div>
        </Card>

        <Card title="Telemetry">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--c-ink)]">Composition telemetry</p>
                <p className="text-xs text-[var(--c-muted)]">
                  Track typing duration, paste events, idle gaps
                </p>
              </div>
              <Switch checked={true} onCheckedChange={() => {}} label="" />
            </div>
            <Input
              label="Disclosure text"
              defaultValue="This session records composition timing to help you reflect on your writing process."
            />
          </div>
        </Card>

        <Card title="AI Budget">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Session soft warning ($)" type="number" defaultValue="5.00" />
            <Input label="Session hard ceiling ($)" type="number" defaultValue="15.00" />
          </div>
          <p className="mt-2 text-xs text-[var(--c-muted)]">
            When soft warning is hit, instructor sees an alert. At hard ceiling, non-essential AI
            features pause.
          </p>
        </Card>
      </div>
    </AdminShell>
  );
}
