import { existsSync, readFileSync } from "node:fs";
import { CatalogArtefactSchema, courseKey, type ArtefactMeta, type Course } from "@sageplan/shared";
import { PipelineError } from "./errors.ts";

/**
 * Read the existing catalog.
 *
 * "No catalog yet" and "a catalog I cannot read" are NOT the same thing, and
 * conflating them is a silent-data-loss bug: the caller preserves every course
 * whose affiliation it does not own, so returning [] for an unreadable file
 * makes a PO-only refresh delete all 984 non-Pomona courses and exit 0. A
 * schemaVersion bump, a hand edit or an interrupted write is enough to trigger
 * it. Absent -> empty. Present but unreadable -> stop, keep yesterday's file.
 */
export function readExistingCourses(path: string): Course[] {
  if (!existsSync(path)) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new PipelineError(
      `${path} exists but is not valid JSON (${(e as Error).message}). Refusing to rebuild from it, because doing so would drop every course this command does not own. Fix or delete the file.`,
      "CATALOG_UNREADABLE",
    );
  }
  const parsed = CatalogArtefactSchema.safeParse(raw);
  if (!parsed.success) {
    throw new PipelineError(
      `${path} exists but does not match CatalogArtefact. Refusing to rebuild from it, because doing so would drop every course this command does not own. Fix or delete the file.`,
      "CATALOG_UNREADABLE",
      undefined,
      parsed.error.issues.slice(0, 10),
    );
  }
  return parsed.data.courses;
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
