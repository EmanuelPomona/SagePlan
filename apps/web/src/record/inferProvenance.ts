import type { CourseId, Provenance } from "@gradguide/shared";

/** The Claremont campus codes. Anything else came from outside. */
const CLAREMONT = new Set(["PO", "HM", "SC", "CM", "PZ", "CG", "KS", "JT"]);

/**
 * Where a course was taken, read off its campus code (ADR-015).
 *
 * The student is never asked: a Pomona course is Pomona work, another 5C code
 * is cross-registration, and `EXT` is the only case that needs a human, which
 * is why the non-catalog form asks there and only there.
 */
export function provenanceFor(course: CourseId): Provenance {
  if (course.affiliation === "PO") return "pomona";
  if (CLAREMONT.has(course.affiliation)) return "claremont";
  return "transfer";
}

export { CLAREMONT };
