import { createRoute, createRootRoute, createRouter } from "@tanstack/react-router";
import App from "./App";
import { InstructorPreviewGate } from "@/components/instructor/instructor-preview-gate";
import { RootLayout } from "@/components/layout/root-layout";
import { AdminModelsPage } from "@/pages/admin-models-page";
import { AdminObservabilityPage } from "@/pages/admin-observability-page";
import { AdminPromptsPage } from "@/pages/admin-prompts-page";
import { AdminProtectionPage } from "@/pages/admin-protection-page";
import { AdminDemoPage } from "@/pages/admin-demo-page";
import { AdminRetrievalPage } from "@/pages/admin-retrieval-page";
import { FightPage } from "@/pages/fight-page";
import { InstructorDashboardPage } from "@/pages/instructor-dashboard-page";
import { JoinCodePage } from "@/pages/join-code-page";
import { InstructorSessionPage } from "@/pages/instructor-session-page";
import { JoinPage } from "@/pages/join-page";
import { ParticipantSessionPage } from "@/pages/participant-session-page";
import { ProjectorPage } from "@/pages/projector-page";
import { ReviewPage } from "@/pages/review-page";
import { SessionNewPage } from "@/pages/session-new-page";
import { DemoPersonasPage } from "@/pages/demo-personas-page";
import { TemplatesPage } from "@/pages/templates-page";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: App,
});

const demoPersonasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/demo/personas",
  component: DemoPersonasPage,
});

const joinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/join",
  component: JoinCodePage,
});

const joinWithCodeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/join/$sessionCode",
  component: JoinPage,
});

const sessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/session/$sessionSlug",
  component: ParticipantSessionPage,
});

const sessionFightRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/session/$sessionSlug/fight/$fightSlug",
  component: FightPage,
});

const sessionReviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/session/$sessionSlug/review",
  component: ReviewPage,
});

const instructorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor",
  component: () => (
    <InstructorPreviewGate>
      <InstructorDashboardPage />
    </InstructorPreviewGate>
  ),
});

const instructorSessionNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/session/new",
  component: () => (
    <InstructorPreviewGate>
      <SessionNewPage />
    </InstructorPreviewGate>
  ),
});

const instructorSessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/session/$sessionSlug",
  component: () => (
    <InstructorPreviewGate>
      <InstructorSessionPage />
    </InstructorPreviewGate>
  ),
});

const instructorProjectorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/session/$sessionSlug/projector",
  component: ProjectorPage,
});

const instructorTemplatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/templates",
  component: () => (
    <InstructorPreviewGate>
      <TemplatesPage />
    </InstructorPreviewGate>
  ),
});

const instructorAdminModelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/admin/models",
  component: () => (
    <InstructorPreviewGate>
      <AdminModelsPage />
    </InstructorPreviewGate>
  ),
});

const instructorAdminPromptsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/admin/prompts",
  component: () => (
    <InstructorPreviewGate>
      <AdminPromptsPage />
    </InstructorPreviewGate>
  ),
});

const instructorAdminRetrievalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/admin/retrieval",
  component: () => (
    <InstructorPreviewGate>
      <AdminRetrievalPage />
    </InstructorPreviewGate>
  ),
});

const instructorAdminProtectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/admin/protection",
  component: () => (
    <InstructorPreviewGate>
      <AdminProtectionPage />
    </InstructorPreviewGate>
  ),
});

const instructorAdminObservabilityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/admin/observability",
  component: () => (
    <InstructorPreviewGate>
      <AdminObservabilityPage />
    </InstructorPreviewGate>
  ),
});

const instructorAdminDemoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor/admin/demo",
  component: () => (
    <InstructorPreviewGate>
      <AdminDemoPage />
    </InstructorPreviewGate>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  demoPersonasRoute,
  joinRoute,
  joinWithCodeRoute,
  sessionRoute,
  sessionFightRoute,
  sessionReviewRoute,
  instructorRoute,
  instructorSessionNewRoute,
  instructorSessionRoute,
  instructorProjectorRoute,
  instructorTemplatesRoute,
  instructorAdminModelsRoute,
  instructorAdminPromptsRoute,
  instructorAdminRetrievalRoute,
  instructorAdminProtectionRoute,
  instructorAdminObservabilityRoute,
  instructorAdminDemoRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
