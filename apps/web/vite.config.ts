import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { hasRealData, serveData } from "./vite-plugins/serveData.ts";

const webRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(webRoot, "..", "..");

/**
 * Ports are assigned per worktree by scripts/bootstrap.sh so several agents can
 * run at once. Never hardcode 3000: read it from .env, and fail loudly rather
 * than silently landing on someone else's port.
 */
function frontendPort(): number {
  const envFile = join(repoRoot, ".env");
  if (existsSync(envFile)) {
    const match = /^FRONTEND_PORT=(\d+)$/m.exec(readFileSync(envFile, "utf8"));
    if (match?.[1]) return Number(match[1]);
  }
  if (process.env.FRONTEND_PORT) return Number(process.env.FRONTEND_PORT);
  throw new Error("FRONTEND_PORT is not set. Run scripts/bootstrap.sh to assign this worktree a port.");
}

export default defineConfig(({ command }) => {
  // Only the dev server and `vite preview` listen on a port. A build binds
  // nothing, so it must not need a worktree's .env: CI and deploys have none.
  const port = command === "serve" ? frontendPort() : undefined;
  return {
    root: webRoot,
    plugins: [react(), serveData({ repoRoot, webRoot })],
    define: {
      // The app renders an unmissable banner when this is true.
      __FIXTURE_DATA__: JSON.stringify(!hasRealData(repoRoot)),
    },
    server: { port, strictPort: true },
    preview: { port, strictPort: true },
  };
});
