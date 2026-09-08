import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SectionsArtefactSchema, type Section } from "@gradguide/shared";

/** Every section on disk, across all term files. */
export function readSections(dataDir: string): Section[] {
  const out: Section[] = [];
  if (!existsSync(dataDir)) return out;
  for (const f of readdirSync(dataDir)) {
    if (!/^sections-.+\.json$/.test(f)) continue;
    try {
      const parsed = SectionsArtefactSchema.safeParse(JSON.parse(readFileSync(join(dataDir, f), "utf8")));
      if (parsed.success) out.push(...parsed.data.sections);
    } catch { /* validator 1 reports unreadable files */ }
  }
  return out;
}
