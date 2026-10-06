import type { CourseId } from "@sageplan/shared";

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
  // `code` and `subjectCode` genuinely disagree in this catalog — e.g.
  // { code: "LATN033 PO", subjectCode: "CLAS" } and { code: "DS 190 PO",
  // subjectCode: "ID" } — so when the code does not start with the subject we
  // fall back to `courseNumber`. That field DOES carry the affiliation here
  // ("033 PO", "199DRPO"), so the strip must run on both paths; gating it on the
  // code path produced CLAS 033PO PO instead of CLAS 033 PO for 10 real courses.
  let remainder = (rawCode.startsWith(dept) ? rawCode.slice(dept.length) : String(courseNumber ?? "").toUpperCase()).replace(/\s+/g, "");
  if (remainder.length === 0) return null;

  let affiliation: string = DEFAULT_AFFILIATION;
  for (const aff of KNOWN_AFFILIATIONS) {
    if (remainder.length > aff.length && remainder.endsWith(aff)) {
      affiliation = aff;
      remainder = remainder.slice(0, -aff.length);
      break;
    }
  }

  // Anchored to at most three digits followed by a NON-digit suffix: a looser
  // pattern silently turned "MATH1000" into MATH 100 suffix "0", and course
  // number feeds the 190-199 senior-exercise rule.
  const m = /^(\d{1,3})([A-Z][A-Z0-9]{0,2}|)$/.exec(remainder);
  if (!m) return null;
  const courseNum = Number(m[1]);
  if (!Number.isInteger(courseNum) || courseNum < 0 || courseNum > 999) return null;

  return { department: dept, courseNumber: courseNum, suffix: m[2] ?? "", affiliation };
}
