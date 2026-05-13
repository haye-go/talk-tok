import { Card } from "@/components/ui/card";

export function ConsensusPulseStub() {
  return (
    <Card>
      <p className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--c-muted)]">
        Consensus Pulse
      </p>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[var(--c-sig-coral)]">Against</span>
        <div className="flex h-2.5 flex-1 overflow-hidden rounded-pill bg-[var(--c-hairline)]">
          <div className="bg-[var(--c-sig-coral)]" style={{ width: "30%" }} />
          <div className="bg-[var(--c-sig-mustard)]" style={{ width: "25%" }} />
          <div className="bg-[var(--c-sig-sky)]" style={{ width: "45%" }} />
        </div>
        <span className="text-[10px] text-[var(--c-sig-sky)]">For</span>
      </div>
      <p className="mt-2 text-[10px] text-[var(--c-muted)]">
        Placeholder — live consensus signal pending backend.
      </p>
    </Card>
  );
}
