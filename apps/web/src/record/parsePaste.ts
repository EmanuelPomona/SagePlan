import { courseKey, parseCourseKey, sameTerm, termCode } from "@gradguide/shared";
import type { CompletedCourse, Course, GradeMode, Provenance, TermId } from "@gradguide/shared";
import type { CourseIndex } from "./courseIndex.ts";

export type RejectedLine = { line: number; text: string; reason: string };
export type PasteResult = { rows: CompletedCourse[]; rejected: RejectedLine[] };

/** Everything the grade select offers, which is everything we will accept. */
export const GRADE_VALUES = [
  "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F",
  "CR", "P", "NC", "NP", "IP",
] as const;

const SEASON_WORDS: Record<string, "FA" | "SP"> = {
  FA: "FA", FALL: "FA", F: "FA",
  SP: "SP", SPRING: "SP", S: "SP",
};

/**
 * The spreadsheet is the competitor, so this accepts what a spreadsheet
 * actually produces: tabs or commas, a header row or none, codes with or
 * without spaces, and terms written six different ways.
 *
 * Nothing is ever added silently. A line we cannot read comes back in
 * `rejected` with a reason that names the field, so the student can see what
 * went wrong instead of wondering what happened to their courses.
 */
export function parsePaste(
  text: string,
  index: CourseIndex,
  defaults: { term: TermId; existing?: CompletedCourse[] },
): PasteResult {
  const rows: CompletedCourse[] = [];
  const rejected: RejectedLine[] = [];
  const taken = new Set(
    (defaults.existing ?? []).map((c) => `${courseKey(c.course)}@${termCode(c.term)}`),
  );

  const lines = text.split(/\r?\n/);
  lines.forEach((rawLine, i) => {
    const line = rawLine.trim();
    const lineNumber = i + 1;
    if (line === "") return;

    const fields = line.split(/\t|,/).map((f) => f.trim()).filter((f) => f !== "");
    if (fields.length === 0) return;

    const [codeField, termField, gradeField] = fields;
    if (codeField === undefined) return;

    // A header row looks like a course code that is not one. Skip it silently:
    // pasting the header is normal, not an error worth reporting.
    if (i === 0 && looksLikeHeader(codeField)) return;

    const id = parseCourseKey(codeField) ?? parseSquashedCode(codeField);
    if (!id) {
      rejected.push({ line: lineNumber, text: line, reason: `Could not read a course code from "${codeField}".` });
      return;
    }

    const key = courseKey(id);
    const catalogCourse = index.byKey.get(key);
    if (!catalogCourse) {
      rejected.push({ line: lineNumber, text: line, reason: `${key} is not in catalog.` });
      return;
    }

    let term = defaults.term;
    if (termField !== undefined) {
      const parsed = parseLooseTerm(termField);
      if (!parsed) {
        rejected.push({ line: lineNumber, text: line, reason: `Could not read the term "${termField}".` });
        return;
      }
      term = parsed;
    }

    let grade = "";
    if (gradeField !== undefined) {
      const parsed = parseGrade(gradeField);
      if (!parsed) {
        rejected.push({ line: lineNumber, text: line, reason: `Could not read the grade "${gradeField}".` });
        return;
      }
      grade = parsed;
    }

    const slot = `${key}@${termCode(term)}`;
    if (taken.has(slot)) {
      rejected.push({ line: lineNumber, text: line, reason: `${key} in ${termCode(term)} is already in your record.` });
      return;
    }
    taken.add(slot);

    rows.push({
      course: id,
      term,
      grade,
      gradeMode: gradeModeFor(grade),
      provenance: provenanceFor(catalogCourse),
    });
  });

  return { rows, rejected };
}

function looksLikeHeader(field: string): boolean {
  return /^(course|code|class|subject|title)$/i.test(field.trim());
}

/** "CSCI051 PO" and "CSCI051PO", which is what a spreadsheet column often holds. */
function parseSquashedCode(field: string): ReturnType<typeof parseCourseKey> {
  const m = /^([A-Za-z]{2,5})\s*0*(\d{1,3})([A-Za-z0-9]{0,3})\s*([A-Za-z]{2,3})$/.exec(field.trim());
  if (!m?.[1] || !m[2] || !m[4]) return null;
  return parseCourseKey(`${m[1]} ${m[2].padStart(3, "0")}${m[3] ?? ""} ${m[4]}`);
}

/** FA2025, Fall 2025, F25, SP2026, Spring 2026, S26. */
export function parseLooseTerm(field: string): TermId | null {
  const text = field.trim().toUpperCase().replace(/\s+/g, " ");
  const m = /^([A-Z]+)\s*(\d{2}|\d{4})$/.exec(text);
  if (!m?.[1] || !m[2]) return null;

  const season = SEASON_WORDS[m[1]];
  if (!season) return null;

  const digits = m[2];
  const year = digits.length === 2 ? 2000 + Number(digits) : Number(digits);
  if (!Number.isFinite(year) || year < 2000 || year > 2100) return null;
  return { year, term: season };
}

export function parseGrade(field: string): string | null {
  const upper = field.trim().toUpperCase();
  return (GRADE_VALUES as readonly string[]).includes(upper) ? upper : null;
}

function gradeModeFor(grade: string): GradeMode {
  if (grade === "CR" || grade === "NC") return "creditNoCredit";
  if (grade === "P" || grade === "NP") return "passNoPass";
  return "letter";
}

/** Pomona work is pomona; anything else in the catalog is another 5C college. */
export function provenanceFor(course: Course): Provenance {
  return course.id.affiliation === "PO" ? "pomona" : "claremont";
}

export { sameTerm };
