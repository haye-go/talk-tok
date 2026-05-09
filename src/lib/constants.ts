import {
  ChartBar,
  ChatCircleText,
  Crosshair,
  Eye,
  GearSix,
  Lightning,
  Megaphone,
  ShieldCheck,
  User,
  type Icon,
} from "@phosphor-icons/react";

export type ActId = "submit" | "discover" | "challenge" | "synthesize";
export type TabId = "main" | "stream" | "fight-me" | "my-zone";

export interface ActDefinition {
  id: ActId;
  label: string;
  subtitle: string;
  color: string;
}

export interface TabDefinition {
  id: TabId;
  label: string;
  icon: Icon;
}

export const DEMO_SESSION_CODE = "SPARK";
export const DEMO_SESSION_SLUG = "demo-discussion";

export const ACTS: ActDefinition[] = [
  {
    id: "submit",
    label: "Submit",
    subtitle: "Share your perspective",
    color: "var(--c-sig-sky)",
  },
  {
    id: "discover",
    label: "Discover",
    subtitle: "See what others think",
    color: "var(--c-sig-peach)",
  },
  {
    id: "challenge",
    label: "Challenge",
    subtitle: "Defend and refine your position",
    color: "var(--c-sig-coral)",
  },
  {
    id: "synthesize",
    label: "Synthesize",
    subtitle: "See the big picture",
    color: "var(--c-sig-slate)",
  },
];

export const TABS: TabDefinition[] = [
  { id: "main", label: "Main", icon: Crosshair },
  { id: "stream", label: "Stream", icon: ChatCircleText },
  { id: "fight-me", label: "Fight Me", icon: Lightning },
  { id: "my-zone", label: "My Zone", icon: User },
];

export const INSTRUCTOR_NAV = [
  { label: "Sessions", path: "/instructor", icon: ChartBar },
  { label: "Templates", path: "/instructor/templates", icon: Megaphone },
  { label: "Models", path: "/instructor/admin/models", icon: GearSix },
  { label: "Protection", path: "/instructor/admin/protection", icon: ShieldCheck },
  { label: "Observability", path: "/instructor/admin/observability", icon: Eye },
] as const;
