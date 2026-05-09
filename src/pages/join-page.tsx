import { QrCode } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DEMO_SESSION_CODE, DEMO_SESSION_SLUG } from "@/lib/constants";
import { routes } from "@/lib/routes";

export function JoinPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
      <Card title="Join Discussion" eyebrow="Participant entry" className="w-full max-w-md">
        <div className="grid gap-4">
          <Input
            label="Session code"
            defaultValue={DEMO_SESSION_CODE}
            className="text-center font-mono text-2xl tracking-[0.3em]"
          />
          <Input label="Nickname" placeholder="Enter a nickname" />
          <Button
            type="button"
            icon={<QrCode size={18} />}
            onClick={() => (window.location.href = routes.session(DEMO_SESSION_SLUG))}
          >
            Continue to session
          </Button>
          <p className="text-center text-xs text-[var(--c-muted)]">
            QR scanning will route here in the next phase.
          </p>
        </div>
      </Card>
    </main>
  );
}
