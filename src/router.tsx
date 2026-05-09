import { createRoute, createRootRoute, createRouter, Outlet } from "@tanstack/react-router";
import App from "./App";

function RootLayout() {
  return <Outlet />;
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: App,
});

const sessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sessions/$sessionSlug",
  component: App,
});

const instructorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instructor",
  component: App,
});

const routeTree = rootRoute.addChildren([indexRoute, sessionRoute, instructorRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
