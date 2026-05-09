import { ArrowsClockwise } from "@phosphor-icons/react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AdminRetrievalPage() {
  return (
    <AdminShell
      title="Retrieval / Context"
      description="Embedding model, context window, and reindex controls."
    >
      <div className="grid gap-4">
        <Card title="Context Configuration">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Recent-message limit" type="number" defaultValue="10" />
            <Input label="Search result limit" type="number" defaultValue="5" />
            <Input label="Range before (messages)" type="number" defaultValue="2" />
            <Input label="Range after (messages)" type="number" defaultValue="1" />
          </div>
        </Card>

        <Card title="Embedding Model">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--c-ink)]">
                Retrieval provider
              </label>
              <select className="w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm text-[var(--c-body)]">
                <option>Convex Vector Search</option>
                <option>External (Pinecone)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--c-ink)]">
                Embedding model
              </label>
              <select className="w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm text-[var(--c-body)]">
                <option>text-embedding-3-small</option>
                <option>text-embedding-3-large</option>
              </select>
            </div>
          </div>
        </Card>

        <Card title="Reindex">
          <p className="mb-3 text-sm text-[var(--c-body)]">
            Rebuild embeddings for all submissions in the current session. This is a background
            operation.
          </p>
          <Button variant="secondary" icon={<ArrowsClockwise size={14} />}>
            Trigger Reindex
          </Button>
        </Card>
      </div>
    </AdminShell>
  );
}
