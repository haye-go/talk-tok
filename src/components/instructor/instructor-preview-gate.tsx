import { useState, type FormEvent, type ReactNode } from "react";
import { LockKey } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useInstructorPreviewAuth } from "@/hooks/use-instructor-preview-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function InstructorPreviewGateInner({ children }: { children: ReactNode }) {
  const { previewPassword, setPreviewPassword } = useInstructorPreviewAuth();
  const login = useMutation(api.previewAuth.login);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = password.trim();

    if (!candidate) {
      setError("Enter the instructor preview password.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login({ password: candidate });
      setPreviewPassword(candidate);
      setPassword("");
    } catch {
      setError("Password did not match.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (previewPassword) {
    return children;
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--c-canvas)] p-4">
      <Card className="w-full max-w-sm" title="Instructor Preview" eyebrow="Protected access">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="flex items-start gap-3 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3">
            <LockKey size={18} className="mt-0.5 shrink-0 text-[var(--c-muted)]" />
            <p className="text-sm text-[var(--c-body)]">
              Enter the shared preview password to load instructor tools and internal session data.
            </p>
          </div>
          <Input
            label="Preview password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={error ?? undefined}
            autoFocus
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Checking..." : "Unlock preview"}
          </Button>
        </form>
      </Card>
    </main>
  );
}

export function InstructorPreviewGate({ children }: { children: ReactNode }) {
  return <InstructorPreviewGateInner>{children}</InstructorPreviewGateInner>;
}
