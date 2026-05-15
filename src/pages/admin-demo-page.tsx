import { useState } from "react";
import { ArrowSquareOut, Copy, Play, Rocket, Trash, Warning } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AdminShell } from "@/components/layout/admin-shell";
import { LoadingState } from "@/components/state/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MetricTile } from "@/components/ui/metric-tile";
import { Switch } from "@/components/ui/switch";
import { useInstructorPreviewAuth } from "@/hooks/use-instructor-preview-auth";

interface DemoToggle {
  key: string;
  enabled: boolean;
}

const TOGGLE_KEYS = [
  { key: "simulateAiFailure" as const, label: "Simulate AI Failure" },
  { key: "simulateBudgetExceeded" as const, label: "Simulate Budget Exceeded" },
  { key: "simulateSlowAi" as const, label: "Simulate Slow AI" },
];

export function AdminDemoPage() {
  const navigate = useNavigate();
  const { previewPassword } = useInstructorPreviewAuth();
  const previewArgs = previewPassword ? { previewPassword } : "skip";
  const demoSession = useQuery(api.demo.getDemoSession, previewArgs);
  const health = useQuery(api.demo.health, previewArgs);
  const toggles = useQuery(api.demo.listToggles, previewArgs);

  const seed = useMutation(api.demo.seed);
  const resetSession = useMutation(api.demo.resetSession);
  const setToggle = useMutation(api.demo.setToggle);

  const stageSession = useQuery(api.stageDemo.getFoodHackathonSession, previewArgs);
  const seedStage = useMutation(api.stageDemo.seedFoodHackathon);
  const resetStage = useMutation(api.stageDemo.resetFoodHackathonSession);

  const [seeding, setSeeding] = useState(false);
  const [resetExisting, setResetExisting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");

  const [stageSeeding, setStageSeeding] = useState(false);
  const [stageWarmStart, setStageWarmStart] = useState(false);
  const [stageJoinCode, setStageJoinCode] = useState("");
  const [stageResetting, setStageResetting] = useState(false);
  const [stageConfirm, setStageConfirm] = useState("");
  const [stageSeedResult, setStageSeedResult] = useState<{
    joinCode: string;
    joinPath: string;
    instructorPath: string;
    participantCount: number;
    categoryCount: number;
    warmStartIncluded: boolean;
  } | null>(null);

  async function handleSeed() {
    setSeeding(true);
    try {
      await seed({ resetExisting, previewPassword: previewPassword ?? "" });
    } finally {
      setSeeding(false);
    }
  }

  async function handleReset() {
    if (confirmPhrase !== "RESET DEMO SESSION") return;
    setResetting(true);
    try {
      await resetSession({ confirmation: "RESET DEMO SESSION", previewPassword: previewPassword ?? "" });
      setConfirmPhrase("");
    } finally {
      setResetting(false);
    }
  }

  async function handleSeedStage() {
    setStageSeeding(true);
    setStageSeedResult(null);
    try {
      const result = await seedStage({
        includeWarmStart: stageWarmStart,
        joinCode: stageJoinCode || undefined,
        previewPassword: previewPassword ?? "",
      });
      setStageSeedResult(result);
    } finally {
      setStageSeeding(false);
    }
  }

  async function handleResetStage() {
    if (stageConfirm !== "RESET FOOD HACKATHON SESSION") return;
    setStageResetting(true);
    try {
      await resetStage({
        confirmation: "RESET FOOD HACKATHON SESSION",
        previewPassword: previewPassword ?? "",
      });
      setStageConfirm("");
      setStageSeedResult(null);
    } finally {
      setStageResetting(false);
    }
  }

  const toggleMap = new Map((toggles ?? []).map((t: DemoToggle) => [t.key, t.enabled]));

  return (
    <AdminShell title="Demo Management" description="Seed, reset, and configure demo sessions.">
      <div className="grid max-w-3xl gap-4">
        {demoSession === undefined && <LoadingState label="Loading demo..." />}

        {/* Demo Session */}
        <Card title="Demo Session">
          {demoSession === null && (
            <p className="mb-3 text-sm text-[var(--c-muted)]">No demo session seeded.</p>
          )}
          {demoSession && (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MetricTile label="Slug" value={demoSession.slug} />
              <MetricTile label="Code" value={demoSession.joinCode} />
              <MetricTile label="Phase" value={demoSession.phase ?? "—"} />
              <MetricTile label="Act" value={demoSession.currentAct ?? "—"} />
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button icon={<Play size={14} />} onClick={handleSeed} disabled={seeding}>
              {seeding ? "Seeding..." : "Seed Demo"}
            </Button>
            <div className="flex items-center gap-1.5">
              <Switch checked={resetExisting} onCheckedChange={setResetExisting} label="" />
              <span className="text-xs text-[var(--c-muted)]">Reset existing</span>
            </div>
          </div>
        </Card>

        {/* Health */}
        {health && (
          <Card title="Deployment Health">
            <div className="mb-3 flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: health.ok ? "var(--c-success)" : "var(--c-error)" }}
              />
              <span className="text-xs text-[var(--c-ink)]">
                {health.ok ? "Healthy" : "Issues detected"}
              </span>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MetricTile label="Models" value={String(health.configured.modelSettings)} />
              <MetricTile label="Prompts" value={String(health.configured.promptTemplates)} />
              <MetricTile label="Protection" value={String(health.configured.protectionSettings)} />
              <MetricTile label="Toggles" value={String(health.configured.demoToggles)} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(health.configured.components ?? {}).map(([name, ok]) => (
                <Badge
                  key={name}
                  tone={(ok as boolean) ? "success" : "error"}
                  className="text-[9px]"
                >
                  {name}
                </Badge>
              ))}
            </div>
            {health.session?.counts && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                <MetricTile
                  label="Participants"
                  value={String(health.session.counts.participants)}
                />
                <MetricTile label="Submissions" value={String(health.session.counts.submissions)} />
                <MetricTile label="Categories" value={String(health.session.counts.categories)} />
                <MetricTile label="AI Jobs" value={String(health.session.counts.aiJobs)} />
              </div>
            )}
          </Card>
        )}

        {/* Simulation Toggles */}
        <Card title="Simulation Toggles">
          <div className="grid gap-3">
            {TOGGLE_KEYS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-[var(--c-ink)]">{label}</span>
                <Switch
                  checked={toggleMap.get(key) ?? false}
                  onCheckedChange={(enabled) =>
                    void setToggle({ key, enabled, previewPassword: previewPassword ?? "" })
                  }
                  label=""
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Reset */}
        <Card title="Reset Demo">
          <div className="rounded-md border border-[var(--c-error)] bg-[var(--c-surface-soft)] p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--c-error)]">
              <Warning size={14} />
              This will delete all demo session data.
            </p>
            <Input
              label="Type RESET DEMO SESSION to confirm"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              className="mb-2"
            />
            <Button
              variant="coral"
              size="sm"
              icon={<Trash size={14} />}
              onClick={handleReset}
              disabled={confirmPhrase !== "RESET DEMO SESSION" || resetting}
            >
              {resetting ? "Resetting..." : "Reset Demo Session"}
            </Button>
          </div>
        </Card>

        {/* ─── Live Stage Demo ─── */}
        <div className="col-span-full border-t border-[var(--c-hairline)] pt-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--c-muted)]">
            Live Stage Demo
          </p>
        </div>

        <Card title="Food Hackathon Session">
          {stageSession === undefined && (
            <p className="text-sm text-[var(--c-muted)]">Loading...</p>
          )}
          {stageSession === null && (
            <p className="mb-3 text-sm text-[var(--c-muted)]">No live stage session seeded.</p>
          )}
          {stageSession && (
            <div className="mb-3">
              <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MetricTile label="Slug" value={stageSession.slug} />
                <MetricTile label="Code" value={stageSession.joinCode} />
                <MetricTile label="Phase" value={stageSession.phase ?? "—"} />
                <MetricTile label="Participants" value={String(stageSession.participantCount)} />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <MetricTile label="Submissions" value={String(stageSession.submissionCount)} />
                <MetricTile label="Categories" value={String(stageSession.categoryCount)} />
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1 text-[10px] text-[var(--c-primary)] hover:underline"
                  onClick={() => {
                    void navigate({ to: stageSession.instructorPath });
                  }}
                >
                  <ArrowSquareOut size={10} /> Instructor view
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 text-[10px] text-[var(--c-primary)] hover:underline"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      `${window.location.origin}${stageSession.joinPath}`,
                    );
                  }}
                >
                  <Copy size={10} /> Copy join URL
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Switch checked={stageWarmStart} onCheckedChange={setStageWarmStart} label="" />
                <span className="text-xs text-[var(--c-muted)]">Include warm-start responses</span>
              </div>
            </div>
            <Input
              label="Custom join code (optional)"
              placeholder="Leave blank to auto-generate"
              value={stageJoinCode}
              onChange={(e) => setStageJoinCode(e.target.value.toUpperCase())}
            />
            <Button icon={<Rocket size={14} />} onClick={handleSeedStage} disabled={stageSeeding}>
              {stageSeeding ? "Seeding..." : "Seed Food Hackathon"}
            </Button>
          </div>

          {stageSeedResult && (
            <div className="mt-3 rounded-md border border-[var(--c-success)] bg-[var(--c-surface-soft)] p-3">
              <p className="mb-2 text-xs font-medium text-[var(--c-success)]">
                Seeded successfully
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-3">
                <div>
                  <span className="text-[var(--c-muted)]">Code:</span>{" "}
                  <span className="font-semibold">{stageSeedResult.joinCode}</span>
                </div>
                <div>
                  <span className="text-[var(--c-muted)]">Participants:</span>{" "}
                  <span className="font-semibold">{stageSeedResult.participantCount}</span>
                </div>
                <div>
                  <span className="text-[var(--c-muted)]">Categories:</span>{" "}
                  <span className="font-semibold">{stageSeedResult.categoryCount}</span>
                </div>
                <div>
                  <span className="text-[var(--c-muted)]">Warm start:</span>{" "}
                  <span className="font-semibold">
                    {stageSeedResult.warmStartIncluded ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Reset Stage Demo */}
        {stageSession && (
          <Card title="Reset Stage Demo">
            <div className="rounded-md border border-[var(--c-error)] bg-[var(--c-surface-soft)] p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--c-error)]">
                <Warning size={14} />
                This will delete the food hackathon session and all its data.
              </p>
              <Input
                label="Type RESET FOOD HACKATHON SESSION to confirm"
                value={stageConfirm}
                onChange={(e) => setStageConfirm(e.target.value)}
                className="mb-2"
              />
              <Button
                variant="coral"
                size="sm"
                icon={<Trash size={14} />}
                onClick={handleResetStage}
                disabled={stageConfirm !== "RESET FOOD HACKATHON SESSION" || stageResetting}
              >
                {stageResetting ? "Resetting..." : "Reset Food Hackathon"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
