import { existsSync, readFileSync } from "node:fs";
import { CatalogArtefactSchema, courseKey, type ArtefactMeta, type Course } from "@gradguide/shared";

/** Read an existing catalog if there is a valid one; otherwise start empty. */
export function readExistingCourses(path: string): Course[] {
  if (!existsSync(path)) return [];
  try {
    const parsed = CatalogArtefactSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
    return parsed.success ? parsed.data.courses : [];
  } catch {
    return [];
  }
}

/**
 * The catalog holds every 5C course a Pomona student can count, but the two
 * writers own disjoint halves: `pipeline:catalog` owns the PO set (Coursedog)
 * and `pipeline:sections` owns the rest (Hyperschedule). So a PO refresh
 * REPLACES all PO entries and PRESERVES everything else, and vice versa.
 */
export function mergeCourses(existing: readonly Course[], incoming: readonly Course[], ownedAffiliation: string): Course[] {
  const preserved = existing.filter((c) => c.id.affiliation !== ownedAffiliation);
  const byKey = new Map<string, Course>();
  for (const c of preserved) byKey.set(courseKey(c.id), c);
  for (const c of incoming) byKey.set(courseKey(c.id), c);
  return [...byKey.values()].sort((a, b) => courseKey(a.id).localeCompare(courseKey(b.id)));
}

/** The catalog's own provenance stamp, if the file exists and is valid. */
export function readExistingMeta(path: string): ArtefactMeta | null {
  if (!existsSync(path)) return null;
  try {
    const parsed = CatalogArtefactSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
    return parsed.success ? parsed.data.meta : null;
  } catch {
    return null;
  }
}
