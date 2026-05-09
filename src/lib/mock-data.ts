export const MOCK_SESSION = {
  title: "Ethics of AI in Healthcare",
  code: "SPARK",
  slug: "ethics-ai-healthcare",
  participantCount: 28,
  submittedCount: 24,
  topic:
    "Should AI be allowed to make medical diagnoses without human oversight? Consider legal, ethical, and practical dimensions.",
  mode: "class_discussion" as const,
  visibility: "immediate" as const,
  anonymity: "nickname_visible" as const,
  wordLimit: 200,
  critiqueTone: "spicy" as const,
  fightMeEnabled: true,
  telemetryEnabled: true,
  summaryGate: false,
};

export const MOCK_PARTICIPANT = {
  nickname: "Alex_the_Thinker",
  role: "participant" as const,
};

export const MOCK_CATEGORIES = [
  {
    id: "cat-1",
    name: "Liability & Law",
    color: "sky" as const,
    count: 8,
    summary:
      "Responsibility gap between developers and hospitals, insurance frameworks don't cover AI errors, regulatory lag behind deployment speed.",
  },
  {
    id: "cat-2",
    name: "Patient Autonomy",
    color: "peach" as const,
    count: 6,
    summary:
      "Informed consent challenges with probabilistic diagnoses, power imbalance in doctor-AI-patient triad, erosion of trust.",
  },
  {
    id: "cat-3",
    name: "Cost & Access",
    color: "mustard" as const,
    count: 5,
    summary:
      "Affordability gaps between institutions, rural hospital infrastructure limits, resource allocation trade-offs.",
  },
  {
    id: "cat-4",
    name: "Trust & Accuracy",
    color: "coral" as const,
    count: 5,
    summary:
      "Algorithmic bias in training data, error rate transparency, explainability requirements for clinical decisions.",
  },
  { id: "cat-5", name: "Uncategorized", color: "neutral" as const, count: 4, summary: "" },
];

export const MOCK_SUBMISSION = {
  id: "sub-1",
  text: "I believe AI should assist but not replace doctors because the liability question is unresolved. If an AI misdiagnoses, who is responsible — the hospital, the developer, or the AI itself?",
  categoryId: "cat-1",
  categoryName: "Liability & Law",
  categoryColor: "sky" as const,
  createdAt: Date.now() - 120_000,
  telemetry: { durationMs: 154_000, label: "Composed gradually", pasteEvents: 0 },
};

export const MOCK_FEEDBACK = {
  tone: "spicy" as const,
  originality: 0.68,
  text: "Liability angle? Everyone and their lawyer thinks of that. But you hinted at something spicier — the responsibility gap between devs and hospitals. Push THAT thread harder, it's where your actual brain showed up.",
};

export const MOCK_STREAM_RESPONSES = [
  {
    id: "r-1",
    nickname: "Sam",
    text: "Cost is the biggest barrier to AI adoption in healthcare. Rural hospitals can't afford the infrastructure.",
    categoryColor: "mustard" as const,
    telemetry: { durationMs: 8_000, label: "Likely pasted", pasteEvents: 1 },
    originality: "med" as const,
  },
  {
    id: "r-2",
    nickname: "Maya",
    text: "The responsibility gap between AI developers and deploying hospitals creates an accountability vacuum that existing malpractice law can't fill.",
    categoryColor: "sky" as const,
    telemetry: { durationMs: 134_000, label: "Composed gradually", pasteEvents: 0 },
    originality: "high" as const,
  },
  {
    id: "r-3",
    nickname: "Priya",
    text: "Patient consent must come first. Without informed consent specific to AI-assisted diagnosis, we're violating fundamental medical ethics.",
    categoryColor: "peach" as const,
    telemetry: { durationMs: 98_000, label: "Composed gradually", pasteEvents: 0 },
    originality: "high" as const,
  },
  {
    id: "r-4",
    nickname: "Jake",
    text: "AI bias in training data means marginalized communities get worse diagnoses. That's not a feature — it's discrimination laundered through technology.",
    categoryColor: "coral" as const,
    telemetry: { durationMs: 112_000, label: "Revised actively", pasteEvents: 0 },
    originality: "high" as const,
  },
  {
    id: "r-5",
    nickname: "Wei",
    text: "The real question isn't whether AI should diagnose, but who profits from replacing doctors with algorithms.",
    categoryColor: "mustard" as const,
    telemetry: { durationMs: 67_000, label: "Composed gradually", pasteEvents: 0 },
    originality: "above avg" as const,
  },
];

export const MOCK_FIGHT_ME_TURNS = [
  {
    role: "ai" as const,
    text: "You claim the liability gap is the core issue, but consider: we already have this exact problem with medical devices. Pacemakers malfunction, surgical robots fail. Courts have decades of product liability precedent. What makes AI diagnostics fundamentally different?",
  },
  {
    role: "student" as const,
    text: "Medical devices have clear failure modes — a pacemaker either fires or it doesn't. AI diagnostics are probabilistic and opaque. When an AI says '87% chance of cancer,' who is liable for the 13%? The manufacturer? The hospital that chose that threshold?",
  },
  {
    role: "ai" as const,
    text: "Good distinction on probabilistic vs deterministic. But you're dodging: doctors are ALSO probabilistic. A radiologist reading a scan is giving a probability estimate, just without the number. Isn't the real difference just transparency?",
  },
];

export const MOCK_DEBRIEF = {
  defended:
    "The distinction between probabilistic and deterministic failure modes was sharp and well-supported.",
  weaker:
    "You didn't address the transparency argument directly — the AI's point about doctors also being probabilistic was left hanging.",
  stronger:
    "Arguing that doctor probabilism has built-in accountability (malpractice law, professional licensing) while AI probabilism currently has no equivalent framework.",
};

export const MOCK_ACTIVITY_FEED = [
  {
    type: "submit" as const,
    name: "Maya",
    category: "Liability",
    categoryColor: "sky" as const,
    originality: "High" as const,
    telemetryLabel: "2m 14s · composed gradually",
    time: "just now",
  },
  {
    type: "recat" as const,
    name: "Jake",
    fromCategory: "Autonomy",
    toCategory: "Cost",
    time: "1m ago",
  },
  { type: "followup" as const, name: "Priya", time: "2m ago" },
  { type: "fightme" as const, name: "Alex", time: "3m ago" },
  {
    type: "submit" as const,
    name: "Sam",
    category: "Trust",
    categoryColor: "coral" as const,
    originality: "Med" as const,
    telemetryLabel: "8s · likely pasted",
    time: "4m ago",
  },
  {
    type: "submit" as const,
    name: "Rina",
    category: "Liability",
    categoryColor: "sky" as const,
    originality: "High" as const,
    telemetryLabel: "3m 45s · revised actively",
    time: "5m ago",
  },
  { type: "shift" as const, name: "Wei", category: "Autonomy", time: "6m ago" },
  {
    type: "submit" as const,
    name: "Dan",
    category: "Uncategorized",
    categoryColor: "neutral" as const,
    originality: "—" as const,
    telemetryLabel: "",
    time: "7m ago",
  },
];

export const CRITIQUE_TONES = [
  { id: "gentle", label: "Kind" },
  { id: "direct", label: "Direct" },
  { id: "spicy", label: "Spicy" },
  { id: "roast", label: "Roast" },
] as const;
