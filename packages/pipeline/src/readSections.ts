import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SectionsArtefactSchema, type Section } from "@sageplan/shared";

export interface ReadSectionsResult {
  sections: Section[];
  /** Term files that could not be read. Reported: this feeds validator 4, so a
   * skipped file silently REDUCES that validator's coverage rather than failing
   * it, which a bare catch made invisible. */
  unreadable: string[];
}

/** Every section on disk, across all term files. */
export function readSections(dataDir: string): ReadSectionsResult {
  const sections: Section[] = [];
  const unreadable: string[] = [];
  if (!existsSync(dataDir)) return { sections, unreadable };
  for (const f of readdirSync(dataDir)) {
    if (!/^sections-.+\.json$/.test(f)) continue;
    try {
      const parsed = SectionsArtefactSchema.safeParse(JSON.parse(readFileSync(join(dataDir, f), "utf8")));
      if (parsed.success) sections.push(...parsed.data.sections);
      else unreadable.push(f);
    } catch {
      unreadable.push(f);
    }
  }
  return { sections, unreadable };
}
