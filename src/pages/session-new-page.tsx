import { AdminShell } from "@/components/layout/admin-shell";
import { EmptyState } from "@/components/state/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function SessionNewPage() {
  return (
    <AdminShell
      title="Create Session"
      description="Session setup placeholder with templates and defaults."
    >
      <div className="grid gap-4">
        <Card title="Basic Info">
          <div className="grid gap-3">
            <Input label="Session title" placeholder="Ethics of AI in Healthcare" />
            <Textarea label="Opening topic" placeholder="Write the discussion prompt..." />
            <Button type="button">Create placeholder session</Button>
          </div>
        </Card>
        <EmptyState
          title="Templates not wired yet"
          description="Template loading is part of Phase 02."
        />
      </div>
    </AdminShell>
  );
}
