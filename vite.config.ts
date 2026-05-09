import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  lint: {
    ignorePatterns: ["convex/_generated/**"],
  },
  fmt: {
    ignorePatterns: ["convex/_generated/**"],
  },
  server: {
    port: 2552,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
