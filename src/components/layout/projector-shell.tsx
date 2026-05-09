import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DEMO_SESSION_CODE } from "@/lib/constants";

export function ProjectorShell() {
  return (
    <main className="min-h-dvh bg-[var(--c-canvas)] p-8 text-[var(--c-ink)]">
      <div className="mx-auto grid max-w-6xl gap-8">
        <section className="rounded-lg bg-[var(--c-sig-slate)] p-8 text-white sig-dark">
          <Badge tone="warning">Projector View</Badge>
          <h1 className="mt-4 font-display text-5xl font-medium">Ethics of AI in Healthcare</h1>
          <p className="mt-3 text-3xl">Join code: {DEMO_SESSION_CODE}</p>
        </section>
        <div className="grid gap-6 md:grid-cols-2">
          <Card title="Top Categories" className="text-xl">
            Liability & Law · Patient Autonomy · Cost & Access · Trust & Accuracy
          </Card>
          <Card title="Current Act" className="text-xl">
            Discover: category mapping and shared sensemaking.
          </Card>
        </div>
      </div>
    </main>
  );
}
