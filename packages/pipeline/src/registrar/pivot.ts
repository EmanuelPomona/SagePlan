import { courseKey, parseCourseKey, REGISTRAR_GE_LABELS, type GeAttribute } from "@sageplan/shared";
import { courseIdFromRaw } from "../coursedog/identity.ts";
import type { RegistrarRow } from "./parseCsv.ts";

export interface RegistrarCourse {
  attributes: Set<GeAttribute>;
  title: string;
  affiliation: string;
}

export interface RegistrarPivot {
  byCourse: Map<string, RegistrarCourse>;
  /** Course Number strings that could not be decomposed. Counted, never dropped silently. */
  unparseable: string[];
}

/**
 * The export writes course numbers inconsistently: "CSCI 062 PO", "THEA085  PO"
 * (no space after the subject, two before the campus). The shared
 * `parseCourseKey` is tried first; the fallback splits the leading subject
 * letters and reuses the same decomposition the Coursedog path uses, so both
 * sources produce identical CourseIds.
 */
export function parseRegistrarCourseNumber(raw: string): ReturnType<typeof parseCourseKey> {
  const collapsed = raw.trim().replace(/\s+/g, " ").toUpperCase();
  const direct = parseCourseKey(collapsed);
  if (direct) return direct;
  const subject = /^([A-Z]{2,5})/.exec(collapsed.replace(/\s+/g, ""));
  if (!subject) return null;
  return courseIdFromRaw(subject[1], collapsed.replace(/\s+/g, ""), undefined);
}

/**
 * Long format -> one attribute set per course.
 *
 * Two different columns carry attributes, which is not obvious from the file:
 *   - the six Areas come from the `Breadth Area` column;
 *   - the five overlays come from `Measure Names` where `Measure Values` >= 1.
 * Reading only one of them silently loses half the tags. Verified against the
 * eleven counts the brief measured (Area 1 730 ... PE 241).
 */
export function pivotRegistrar(rows: readonly RegistrarRow[]): RegistrarPivot {
  const byCourse = new Map<string, RegistrarCourse>();
  const unparseable: string[] = [];
  const seenUnparseable = new Set<string>();

  for (const row of rows) {
    const id = parseRegistrarCourseNumber(row.courseNumber);
    if (!id) {
      if (!seenUnparseable.has(row.courseNumber)) {
        seenUnparseable.add(row.courseNumber);
        unparseable.push(row.courseNumber);
      }
      continue;
    }
    const key = courseKey(id);
    let entry = byCourse.get(key);
    if (entry === undefined) {
      entry = { attributes: new Set<GeAttribute>(), title: row.courseTitle, affiliation: id.affiliation };
      byCourse.set(key, entry);
    }

    const area = REGISTRAR_GE_LABELS[row.breadthArea];
    if (area !== undefined) entry.attributes.add(area);

    if (row.measureValue >= 1) {
      const overlay = REGISTRAR_GE_LABELS[row.measureName];
      if (overlay !== undefined) entry.attributes.add(overlay);
    }
  }

  return { byCourse, unparseable };
}
