import type { CourseId } from "@gradguide/shared";

/**
 * Campus / affiliation codes used by Hyperschedule and the Registrar.
 * Needed because Coursedog jams the affiliation onto the end of the course
 * number with no separator ("CHEM001ALPO"), so the only way to split
 * suffix from affiliation is to know the affiliation vocabulary.
 */
export const KNOWN_AFFILIATIONS = [
  "PO", "HM", "SC", "CM", "PZ", "AF", "KS", "JP", "CH", "JT", "AA", "JM", "BK",
] as const;

/** The catalog we fetch is Pomona's, so an unqualified code is a Pomona course. */
export const DEFAULT_AFFILIATION = "PO";

/**
 * Build a CourseId from Coursedog's `subjectCode` + `code`.
 *
 * Coursedog's own `code` is NOT parseable by the shared `parseCourseKey`:
 * 2,300 of 2,811 records write it unspaced ("POLI134 PO"), and the affiliation
 * is often glued to a suffix ("CHEM001ALPO" = CHEM 001AL PO). So we decompose
 * from the structured fields and let `courseKey()` render the canonical string.
 */
export function courseIdFromRaw(subjectCode: string | undefined, code: string | undefined, courseNumber: string | undefined): CourseId | null {
  const dept = String(subjectCode ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2,5}$/.test(dept)) return null;

  const rawCode = String(code ?? "").trim().toUpperCase();
  let remainder = rawCode.startsWith(dept) ? rawCode.slice(dept.length) : String(courseNumber ?? "").toUpperCase();
  remainder = remainder.replace(/\s+/g, "");
  if (remainder.length === 0) return null;

  let affiliation: string = DEFAULT_AFFILIATION;
  for (const aff of KNOWN_AFFILIATIONS) {
    if (remainder.length > aff.length && remainder.endsWith(aff)) {
      affiliation = aff;
      remainder = remainder.slice(0, -aff.length);
      break;
    }
  }

  const m = /^(\d{1,3})([A-Z0-9]{0,3})$/.exec(remainder);
  if (!m) return null;
  const courseNum = Number(m[1]);
  if (!Number.isInteger(courseNum) || courseNum < 0 || courseNum > 999) return null;

  return { department: dept, courseNumber: courseNum, suffix: m[2] ?? "", affiliation };
}
