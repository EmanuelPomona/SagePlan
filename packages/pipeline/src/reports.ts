import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Markdown reports are for humans. The app never fetches data/reports/*. */
export function writeReport(name: string, markdown: string, dataDir = "data"): string {
  const path = join(dataDir, "reports", `${name}.md`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, markdown.endsWith("\n") ? markdown : `${markdown}\n`, "utf8");
  return path;
}

/** One line per phase, counts on every line — the reviewer reads the logs. */
export function log(phase: string, fields: Record<string, string | number>): void {
  const pairs = Object.entries(fields).map(([k, v]) => `${k}=${v}`).join(" ");
  console.log(`[${phase}] ${pairs}`);
}
