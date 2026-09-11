import { courseKey, parseCourseKey, termCode } from "@gradguide/shared";
import type { CompletedCourse, CourseId, GradeMode, TermId } from "@gradguide/shared";
import type { CourseIndex } from "../record/courseIndex.ts";
import { CLAREMONT, provenanceFor } from "../record/inferProvenance.ts";

export type RejectedLine = { line: number; text: string; reason: string };
export type TranscriptResult = {
  rows: CompletedCourse[];
  rejected: RejectedLine[];
  /** Drives the preview's wording: "with terms and grades" vs "course codes only". */
  detected: { terms: boolean; grades: boolean };
};

/** Everything the grade control offers, plus W, which transcripts print. */
const GRADES = new Set([
  "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F",
  "CR", "P", "NC", "NP", "IP", "W",
]);

const SEASONS: Record<string, "FA" | "SP"> = {
  FA: "FA", FALL: "FA", F: "FA",
  SP: "SP", SPRING: "SP", S: "SP",
};

/**
 * A course code anywhere in a line, spaced or squashed.
 *
 * The campus code must be a REAL one. Without that constraint the pattern
 * "letters, number, letters" matches ordinary English, and a transcript is full
 * of it: "Page 1 of 2" parsed as the course PAGE 001 OF and was then reported to
 * the student as a course missing from the catalog. Tolerant, not credulous.
 */
const AFFILIATIONS = [...CLAREMONT, "EXT", "AF", "JP", "CH", "AA", "JM", "BK"];
const CODE = new RegExp(String.raw`\b([A-Z]{2,5})\s?0*(\d{1,3})([A-Z]{0,2})\s+(${AFFILIATIONS.join("|")})\b`);

/**
 * Read a transcript, or a spreadsheet, or a list of codes someone typed.
 *
 * It is deliberately tolerant: it looks for a course code anywhere in a line
 * and takes a term from the line or from the nearest heading above it, because
 * that is how a transcript is actually laid out. Tolerance is only safe because
 * nothing is ever added without the student seeing the preview first, so the
 * parser's job is to be honest about what it did and did not understand rather
 * than to be clever.
 */
export function parseTranscriptText(
  text: string,
  index: CourseIndex,
  options: { existing?: CompletedCourse[] } = {},
): TranscriptResult {
  const rows: CompletedCourse[] = [];
  const rejected: RejectedLine[] = [];
  const taken = new Set((options.existing ?? []).map((c) => slot(c.course, c.term)));
  let detectedTerms = false;
  let detectedGrades = false;
  let headingTerm: TermId | null = null;

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (line === "") return;

    const upper = line.toUpperCase();
    const match = CODE.exec(upper);

    // No course on this line. It might still be a term heading; otherwise it is
    // transcript furniture (page numbers, GPA lines, the student's name) and is
    // silently skipped rather than reported as a failure.
    if (!match) {
      const heading = parseTermText(line);
      if (heading) {
        headingTerm = heading;
        detectedTerms = true;
      }
      return;
    }

    const id = parseCourseKey(`${match[1]} ${match[2]!.padStart(3, "0")}${match[3] ?? ""} ${match[4]}`);
    if (!id) return;

    const key = courseKey(id);
    if (!index.byKey.has(key)) {
      rejected.push({ line: i + 1, text: line, reason: `${key} is not in catalog.` });
      return;
    }

    // What is left of the line once the code is gone.
    const rest = `${upper.slice(0, match.index)} ${upper.slice(match.index + match[0].length)}`.trim();

    const inlineTerm = findTerm(rest);
    if (inlineTerm) detectedTerms = true;
    const term = inlineTerm ?? headingTerm;

    const grade = findGrade(rest);
    if (grade === "invalid") {
      rejected.push({ line: i + 1, text: line, reason: `Could not read the grade "${gradeShaped(rest)}".` });
      return;
    }
    if (grade !== null) detectedGrades = true;

    if (taken.has(slot(id, term))) {
      rejected.push({
        line: i + 1,
        text: line,
        reason: `${key}${term ? ` in ${termCode(term)}` : ""} is already in your record.`,
      });
      return;
    }
    taken.add(slot(id, term));

    rows.push({
      course: id,
      term,
      grade,
      gradeMode: gradeModeFor(grade),
      provenance: provenanceFor(id),
    });
  });

  return { rows, rejected, detected: { terms: detectedTerms, grades: detectedGrades } };
}

const slot = (id: CourseId, term: TermId | null) => `${courseKey(id)}@${term ? termCode(term) : "?"}`;

/** A whole line that is nothing but a term, e.g. "Fall 2025" or "2025-26 Fall". */
function parseTermText(line: string): TermId | null {
  const text = line.trim().toUpperCase().replace(/\s+/g, " ");
  const ranged = /^(\d{4})\s*-\s*\d{2,4}\s+([A-Z]+)$/.exec(text);
  if (ranged?.[1] && ranged[2]) {
    const season = SEASONS[ranged[2]];
    if (season) return { year: Number(ranged[1]), term: season };
  }
  const m = /^([A-Z]+)\s*(\d{2}|\d{4})$/.exec(text);
  if (!m?.[1] || !m[2]) return null;
  const season = SEASONS[m[1]];
  if (!season) return null;
  return toTerm(season, m[2]);
}

/** A term appearing somewhere inside a line that also holds a course. */
function findTerm(rest: string): TermId | null {
  const m = /\b(FA|SPRING|FALL|SP|F|S)\s?(\d{2}|\d{4})\b/.exec(rest);
  if (!m?.[1] || !m[2]) return null;
  const season = SEASONS[m[1]];
  if (!season) return null;
  return toTerm(season, m[2]);
}

function toTerm(season: "FA" | "SP", digits: string): TermId | null {
  const year = digits.length === 2 ? 2000 + Number(digits) : Number(digits);
  if (!Number.isFinite(year) || year < 2000 || year > 2100) return null;
  return { year, term: season };
}

/**
 * A grade, or "invalid" when the line ends in something grade-SHAPED that is not
 * one. Credits ("1.00") and title words are not grade-shaped, so they pass by.
 */
function findGrade(rest: string): string | null | "invalid" {
  const candidate = gradeShaped(rest);
  if (candidate === null) return null;
  return GRADES.has(candidate) ? candidate : "invalid";
}

/** The trailing token, when it has the shape of a grade. */
function gradeShaped(rest: string): string | null {
  const tokens = rest.split(/[\s,\t]+/).filter(Boolean);
  const last = tokens.at(-1);
  if (last === undefined) return null;
  return /^[A-Z]{1,2}[+-]?$/.test(last) ? last : null;
}

function gradeModeFor(grade: string | null): GradeMode | null {
  if (grade === null) return null;
  if (grade === "CR" || grade === "NC") return "creditNoCredit";
  if (grade === "P" || grade === "NP") return "passNoPass";
  return "letter";
}
