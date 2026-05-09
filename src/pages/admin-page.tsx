import { AdminShell } from "@/components/layout/admin-shell";
import { Card } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";

export interface AdminPageProps {
  title: string;
  description: string;
}

export function AdminPage({ title, description }: AdminPageProps) {
  return (
    <AdminShell title={title} description={description}>
      <div className="grid gap-4">
        <InlineAlert tone="info">
          Placeholder only. Backend contracts and forms will be wired in later phases.
        </InlineAlert>
        <Card title={title}>
          Settings surface placeholder for the UI designer and future backend integration.
        </Card>
      </div>
    </AdminShell>
  );
}
