import { useState, type FormEvent } from "react";
import { QrCode } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { normalizeSessionCode } from "@/lib/session-slug";

export function JoinCodePage() {
  const [sessionCode, setSessionCode] = useState("");
  const normalizedCode = normalizeSessionCode(sessionCode);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalizedCode) {
      return;
    }

    window.location.href = routes.join(normalizedCode);
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
      <Card title="Join Discussion" eyebrow="Participant entry" className="w-full max-w-md">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Input
            label="Session code"
            placeholder="SPARK"
            value={sessionCode}
            onChange={(event) => setSessionCode(event.target.value.toUpperCase())}
            className="text-center font-mono text-2xl tracking-[0.3em]"
            autoComplete="off"
            required
          />
          <Button type="submit" icon={<QrCode size={18} />} disabled={!normalizedCode}>
            Continue
          </Button>
        </form>
      </Card>
    </main>
  );
}
