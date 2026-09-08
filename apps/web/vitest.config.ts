import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const webRoot = dirname(fileURLToPath(import.meta.url));

/**
 * Kept separate from vite.config.ts: the app config runs the /data plugin, which
 * refuses to build without real pipeline artefacts. Tests must not depend on
 * that, and Vite's own defineConfig does not carry Vitest's schema.
 */
export default defineConfig({
  root: webRoot,
  plugins: [react()],
  test: {
    environment: "jsdom",
    // jsdom disables localStorage on an opaque origin (about:blank), and the
    // plan store is entirely about localStorage.
    environmentOptions: { jsdom: { url: "http://localhost/" } },
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
