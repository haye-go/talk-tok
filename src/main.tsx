import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { RouterProvider } from "@tanstack/react-router";
import "@/styles/globals.css";
import { router } from "./router";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

const app = <RouterProvider router={router} />;

createRoot(document.getElementById("root")!).render(
  <StrictMode>{convex ? <ConvexProvider client={convex}>{app}</ConvexProvider> : app}</StrictMode>,
);
