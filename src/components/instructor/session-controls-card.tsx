import { useState, type FormEvent } from "react";
import { Eye, FloppyDisk } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type VisibilityMode =
  | "private_until_released"
  | "category_summary_only"
  | "raw_responses_visible";
export type AnonymityMode = "nicknames_visible" | "anonymous_to_peers";
export type CritiqueTone = "gentle" | "direct" | "spicy" | "roast";

export interface SessionControlSnapshot {
  title: string;
  openingPrompt: string;
  phase: string;
  visibilityMode: VisibilityMode;
  anonymityMode: AnonymityMode;
  responseSoftLimitWords: number;
  categorySoftCap: number;
  critiqueToneDefault: CritiqueTone;
  telemetryEnabled: boolean;
  fightMeEnabled: boolean;
  summaryGateEnabled: boolean;
}

export interface SessionSettingsUpdate {
  title: string;
  openingPrompt: string;
  anonymityMode: AnonymityMode;
  responseSoftLimitWords: number;
  categorySoftCap: number;
  critiqueToneDefault: CritiqueTone;
  telemetryEnabled: boolean;
  fightMeEnabled: boolean;
  summaryGateEnabled: boolean;
}

const VISIBILITY_OPTIONS: Array<{
  value: VisibilityMode;
  label: string;
  description: string;
}> = [
  {
    value: "private_until_released",
    label: "Private",
    description: "Students see only their own work.",
  },
  {
    value: "category_summary_only",
    label: "Summaries",
    description: "Release themes and synthesis, but keep peer responses hidden.",
  },
  {
    value: "raw_responses_visible",
    label: "Responses",
    description: "Release peer responses and category summaries.",
  },
];

interface SessionControlsCardProps {
  session: SessionControlSnapshot;
  onVisibilityChange: (visibilityMode: VisibilityMode) => Promise<void>;
  onSettingsSave: (settings: SessionSettingsUpdate) => Promise<void>;
}

export function SessionControlsCard({
  session,
  onVisibilityChange,
  onSettingsSave,
}: SessionControlsCardProps) {
  const [title, setTitle] = useState(session.title);
  const [openingPrompt, setOpeningPrompt] = useState(session.openingPrompt);
  const [anonymityMode, setAnonymityMode] = useState<AnonymityMode>(session.anonymityMode);
  const [responseSoftLimitWords, setResponseSoftLimitWords] = useState(
    String(session.responseSoftLimitWords),
  );
  const [categorySoftCap, setCategorySoftCap] = useState(String(session.categorySoftCap));
  const [critiqueToneDefault, setCritiqueToneDefault] = useState<CritiqueTone>(
    session.critiqueToneDefault,
  );
  const [telemetryEnabled, setTelemetryEnabled] = useState(session.telemetryEnabled);
  const [fightMeEnabled, setFightMeEnabled] = useState(session.fightMeEnabled);
  const [summaryGateEnabled, setSummaryGateEnabled] = useState(session.summaryGateEnabled);
  const [savingVisibility, setSavingVisibility] = useState<VisibilityMode | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  async function handleVisibilityClick(visibilityMode: VisibilityMode) {
    setVisibilityError(null);
    setSavingVisibility(visibilityMode);
    try {
      await onVisibilityChange(visibilityMode);
    } catch (cause) {
      setVisibilityError(cause instanceof Error ? cause.message : "Could not update visibility.");
    } finally {
      setSavingVisibility(null);
    }
  }

  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSettingsError(null);
    setSettingsSaved(false);
    setSavingSettings(true);

    try {
      await onSettingsSave({
        title,
        openingPrompt,
        anonymityMode,
        responseSoftLimitWords: Number(responseSoftLimitWords),
        categorySoftCap: Number(categorySoftCap),
        critiqueToneDefault,
        telemetryEnabled,
        fightMeEnabled,
        summaryGateEnabled,
      });
      setSettingsSaved(true);
      window.setTimeout(() => setSettingsSaved(false), 2500);
    } catch (cause) {
      setSettingsError(cause instanceof Error ? cause.message : "Could not update settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  const inputClass =
    "min-h-10 w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 text-sm text-[var(--c-ink)] outline-none transition focus:border-[var(--c-info-border)]";

  return (
    <Card
      title="Session Controls"
      action={
        <Badge tone={session.visibilityMode === "private_until_released" ? "warning" : "success"}>
          {session.visibilityMode.replace(/_/g, " ")}
        </Badge>
      }
    >
      <div className="grid gap-5">
        <div>
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <p className="font-display text-xs font-medium text-[var(--c-ink)]">
              Student visibility
            </p>
            <Badge tone="neutral" className="text-[10px]">
              {session.phase}
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {VISIBILITY_OPTIONS.map((option) => {
              const selected = session.visibilityMode === option.value;
              const saving = savingVisibility === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => void handleVisibilityClick(option.value)}
                  disabled={Boolean(savingVisibility)}
                  className={cn(
                    "rounded-md border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                    selected
                      ? "border-[var(--c-primary)] bg-[var(--c-sig-cream)]"
                      : "border-[var(--c-hairline)] bg-[var(--c-canvas)] hover:bg-[var(--c-surface-strong)]",
                  )}
                  style={selected ? { borderLeftWidth: 3 } : undefined}
                >
                  <span className="block font-display text-sm font-medium text-[var(--c-ink)]">
                    {saving ? "Saving..." : option.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-[var(--c-muted)]">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="primary"
              icon={<Eye size={14} />}
              onClick={() => void handleVisibilityClick("category_summary_only")}
              disabled={
                Boolean(savingVisibility) || session.visibilityMode === "category_summary_only"
              }
            >
              Release summaries
            </Button>
            <Button
              type="button"
              size="sm"
              variant="primary"
              icon={<Eye size={14} />}
              onClick={() => void handleVisibilityClick("raw_responses_visible")}
              disabled={
                Boolean(savingVisibility) || session.visibilityMode === "raw_responses_visible"
              }
            >
              Release responses
            </Button>
          </div>
          {visibilityError && (
            <p className="mt-2 text-xs text-[var(--c-error)]">{visibilityError}</p>
          )}
        </div>

        <form
          className="grid gap-4 border-t border-[var(--c-hairline)] pt-4"
          onSubmit={handleSettingsSubmit}
        >
          <p className="font-display text-xs font-medium text-[var(--c-ink)]">Configuration</p>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--c-muted)]">
                Session title
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block sm:w-36">
              <span className="mb-1 block text-[11px] font-medium text-[var(--c-muted)]">
                Critique tone
              </span>
              <select
                value={critiqueToneDefault}
                onChange={(event) => setCritiqueToneDefault(event.target.value as CritiqueTone)}
                className={inputClass}
              >
                <option value="gentle">Gentle</option>
                <option value="direct">Direct</option>
                <option value="spicy">Spicy</option>
                <option value="roast">Roast</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--c-muted)]">
              Opening prompt
            </span>
            <textarea
              value={openingPrompt}
              onChange={(event) => setOpeningPrompt(event.target.value)}
              rows={2}
              className="w-full rounded-sm border border-[var(--c-hairline)] bg-[var(--c-canvas)] px-3 py-2 text-sm leading-relaxed text-[var(--c-ink)] outline-none transition focus:border-[var(--c-info-border)]"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--c-muted)]">
                Word limit
              </span>
              <input
                type="number"
                min={20}
                max={1000}
                value={responseSoftLimitWords}
                onChange={(event) => setResponseSoftLimitWords(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--c-muted)]">
                Category cap
              </span>
              <input
                type="number"
                min={2}
                max={40}
                value={categorySoftCap}
                onChange={(event) => setCategorySoftCap(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--c-muted)]">
                Anonymity
              </span>
              <select
                value={anonymityMode}
                onChange={(event) => setAnonymityMode(event.target.value as AnonymityMode)}
                className={inputClass}
              >
                <option value="nicknames_visible">Nicknames visible</option>
                <option value="anonymous_to_peers">Anonymous to peers</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={fightMeEnabled} onCheckedChange={setFightMeEnabled} label="" />
              <span className="text-xs text-[var(--c-ink)]">Fight Me</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={summaryGateEnabled}
                onCheckedChange={setSummaryGateEnabled}
                label=""
              />
              <span className="text-xs text-[var(--c-ink)]">Summary gate</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={telemetryEnabled} onCheckedChange={setTelemetryEnabled} label="" />
              <span className="text-xs text-[var(--c-ink)]">Telemetry</span>
            </div>
          </div>

          {settingsError && <p className="text-xs text-[var(--c-error)]">{settingsError}</p>}
          <div className="flex items-center justify-end gap-3">
            {settingsSaved && <span className="text-xs text-[var(--c-success)]">Saved</span>}
            <Button type="submit" size="sm" disabled={savingSettings}>
              <FloppyDisk size={14} className="mr-1.5" />
              {savingSettings ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
