import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { routes } from "@/lib/routes";

export function SessionNewPage() {
  const createSession = useMutation(api.sessions.create);
  const [title, setTitle] = useState("");
  const [openingPrompt, setOpeningPrompt] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [modePreset, setModePreset] = useState<
    "class_discussion" | "conference_qna" | "debate_lab" | "custom"
  >("class_discussion");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const session = await createSession({
        title,
        openingPrompt,
        modePreset,
        joinCode: joinCode || undefined,
      });
      window.location.href = routes.instructorSession(session.slug);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the session.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminShell
      title="Create Session"
      description="Create a readable session URL and short participant join code."
    >
      <div className="grid gap-4">
        <Card title="Basic Info">
          <form className="grid gap-3" onSubmit={handleSubmit}>
            <Input
              label="Session title"
              placeholder="Ethics of AI in Healthcare"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
            <Textarea
              label="Opening topic"
              placeholder="Write the discussion prompt..."
              value={openingPrompt}
              onChange={(event) => setOpeningPrompt(event.target.value)}
              required
            />
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--c-muted)]">
                Mode preset
              </span>
              <select
                className="min-h-11 w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] px-3 text-sm text-[var(--c-ink)] outline-none"
                value={modePreset}
                onChange={(event) =>
                  setModePreset(
                    event.target.value as
                      | "class_discussion"
                      | "conference_qna"
                      | "debate_lab"
                      | "custom",
                  )
                }
              >
                <option value="class_discussion">Class discussion</option>
                <option value="conference_qna">Conference Q&A</option>
                <option value="debate_lab">Debate lab</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <Input
              label="Optional session code"
              placeholder="SPARK"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              hint="Leave blank to generate a short code automatically."
            />
            {error ? <p className="text-sm text-[var(--c-error)]">{error}</p> : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create session"}
            </Button>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}
