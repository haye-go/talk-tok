import { AdminShell } from "@/components/layout/admin-shell";
import { EmptyState } from "@/components/state/empty-state";

export function TemplatesPage() {
  return (
    <AdminShell title="Templates" description="Reusable session templates placeholder.">
      <EmptyState
        title="No templates loaded"
        description="Template CRUD comes after session creation is backed by Convex."
      />
    </AdminShell>
  );
}
