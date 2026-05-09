import { useState, type FormEvent } from "react";
import { ArrowsClockwise, Rocket } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AdminShell } from "@/components/layout/admin-shell";
import { ToneSelector } from "@/components/submission/tone-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

const MODE_PRESETS = [
  { id: "class_discussion", label: "Class Discussion" },
  { id: "conference_qna", label: "Conference Q&A" },
  { id: "debate_lab", label: "Workshop" },
] as const;

export function SessionNewPage() {
  const createSession = useMutation(api.sessions.create);
  const [title, setTitle] = useState("");
  const [openingPrompt, setOpeningPrompt] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [modePreset, setModePreset] = useState<
    "class_discussion" | "conference_qna" | "debate_lab" | "custom"
  >("class_discussion");
  const [visibility, setVisibility] = useState("immediate");
  const [anonymity, setAnonymity] = useState("nickname_visible");
  const [wordLimit, setWordLimit] = useState("200");
  const [critiqueTone, setCritiqueTone] = useState("spicy");
  const [fightMeEnabled, setFightMeEnabled] = useState(true);
  const [summaryGate, setSummaryGate] = useState(false);
  const [telemetryEnabled, setTelemetryEnabled] = useState(true);
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
      description="Configure a new discussion session with all settings."
    >
      <form className="grid max-w-2xl gap-4" onSubmit={handleSubmit}>
        {/* Mode presets */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--c-muted)]">Session Mode</label>
          <div className="flex gap-1.5 font-display">
            {MODE_PRESETS.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setModePreset(mode.id)}
                className={cn(
                  "rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors",
                  modePreset === mode.id
                    ? "border-[var(--c-primary)] bg-[var(--c-primary)] text-[var(--c-on-primary)]"
                    : "border-[var(--c-hairline)] text-[var(--c-muted)]",
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title + topic */}
        <Input
          label="Session title"
          placeholder="Ethics of AI in Healthcare"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Textarea
          label="Opening topic / question"
          placeholder="Write the discussion prompt..."
          value={openingPrompt}
          onChange={(e) => setOpeningPrompt(e.target.value)}
          required
        />

        {/* Settings grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--c-muted)]">Visibility Mode</label>
            <select
              className="min-h-10 w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 text-sm text-[var(--c-ink)] outline-none"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="immediate">Immediate</option>
              <option value="after_processing">After Processing</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--c-muted)]">Anonymity</label>
            <select
              className="min-h-10 w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 text-sm text-[var(--c-ink)] outline-none"
              value={anonymity}
              onChange={(e) => setAnonymity(e.target.value)}
            >
              <option value="nickname_visible">Nicknames Visible</option>
              <option value="peer_anonymous">Anonymous</option>
            </select>
          </div>
          <Input
            label="Soft word limit"
            type="number"
            value={wordLimit}
            onChange={(e) => setWordLimit(e.target.value)}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--c-muted)]">Default Critique Tone</label>
            <ToneSelector value={critiqueTone} onChange={setCritiqueTone} className="mt-1" />
          </div>
        </div>

        {/* Preset categories (visual only for now) */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--c-muted)]">Preset Categories (optional)</label>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="sky">Legal/Regulatory &times;</Badge>
            <Badge tone="peach">Ethical &times;</Badge>
            <Badge tone="mustard">Practical &times;</Badge>
            <span className="cursor-pointer rounded-pill border border-dashed border-[var(--c-border-strong)] px-2.5 py-0.5 text-xs text-[var(--c-muted)]">
              + Add
            </span>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] px-3 py-2">
            <Switch checked={fightMeEnabled} onCheckedChange={setFightMeEnabled} label="" />
            <span className="text-xs text-[var(--c-ink)]">Fight Me</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] px-3 py-2">
            <Switch checked={summaryGate} onCheckedChange={setSummaryGate} label="" />
            <span className="text-xs text-[var(--c-muted)]">Summary Gate</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] px-3 py-2">
            <Switch checked={telemetryEnabled} onCheckedChange={setTelemetryEnabled} label="" />
            <span className="text-xs text-[var(--c-ink)]">Telemetry</span>
          </div>
        </div>

        {/* Session code */}
        <Card className="text-center">
          <p className="text-[10px] text-[var(--c-muted)]">Session Code</p>
          <div className="my-1">
            <input
              type="text"
              placeholder="SPARK"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="border-none bg-transparent text-center font-display text-3xl font-semibold tracking-[0.3em] text-[var(--c-sig-slate)] placeholder:text-[var(--c-hairline)] focus:outline-none"
              style={{ width: "12ch" }}
            />
          </div>
          <p className="text-[10px] text-[var(--c-muted)]">
            <ArrowsClockwise size={10} className="mr-0.5 inline" />
            Leave blank to auto-generate
          </p>
        </Card>

        {/* Error */}
        {error && <p className="text-sm text-[var(--c-error)]">{error}</p>}

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1">
            Save as Template
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting} icon={<Rocket size={16} />}>
            {isSubmitting ? "Creating..." : "Go Live"}
          </Button>
        </div>
      </form>
    </AdminShell>
  );
}
