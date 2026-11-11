import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Deliberately separate from vite.config.ts: that file goes through
// @lovable.dev/vite-tanstack-config, which wires up the TanStack Start
// server/SSR/Nitro plugins — none of which belong in a unit-test run, and
// some of which don't tolerate Vitest's transform pipeline. Plain Vite
// config plus the same @ alias the app uses (via resolve.tsconfigPaths) is
// all tests need.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
