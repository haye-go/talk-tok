import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AdminShell } from "@/components/layout/admin-shell";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/state/loading-state";

export function AdminProtectionPage() {
  const settings = useQuery(api.protection.list, {});

  return (
    <AdminShell
      title="Protection"
      description="Rate limits, moderation, telemetry, and budget guardrails."
    >
      <div className="grid gap-4">
        <Card title="Status">
          <p className="text-sm text-[var(--c-muted)]">
            This screen is currently read-only. It reflects protection settings already in Convex,
            but editing flows are not exposed here yet.
          </p>
        </Card>

        {settings === undefined && <LoadingState label="Loading protection settings..." />}

        {settings && settings.length === 0 && (
          <Card>
            <p className="text-sm text-[var(--c-muted)]">
              No protection settings configured. Run seed defaults to create initial entries.
            </p>
          </Card>
        )}

        {settings && settings.length > 0 && (
          <Card title="Current Settings">
            <div className="divide-y divide-[var(--c-hairline)]">
              {settings.map((setting) => (
                <div key={setting._id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-display text-sm font-medium text-[var(--c-ink)]">
                      {setting.key}
                    </p>
                    <pre className="mt-1 overflow-x-auto rounded-sm bg-[var(--c-surface-strong)] p-2 font-mono text-[10px] text-[var(--c-body)]">
                      {JSON.stringify(setting.valueJson, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
