import { courseKey, parseCourseKey, termCode } from "@sageplan/shared";
import type { CompletedCourse, CourseId, GradeMode, TermId } from "@sageplan/shared";
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

/**
 * A course line whose campus code is not one of ours: "ECON 101 UCLA".
 *
 * Deliberately narrow. The number must be two or three digits and the unknown
 * code three or four letters, so ordinary transcript furniture ("Page 1 of 2",
 * "Cumulative GPA 3.85") cannot trip it and be reported as a failed course.
 */
const FOREIGN_CODE = new RegExp(
  String.raw`\b[A-Z]{2,5}\s?0*\d{2,3}[A-Z]{0,2}\s+([A-Z]{3,4})\b`,
);

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
        return;
      }
      // A line that is SHAPED like a term heading but did not parse must clear
      // the previous one. Leaving it in force silently stamps the old term onto
      // the new term's courses, and a wrong term is worse than no term: it
      // feeds distinctTerms, sinceMatriculation and matriculation inference.
      // Ordinary furniture ("Credits Earned: 4.00") is not term-shaped and is
      // still skipped in silence, so a heading's own courses keep their term.
      // A department, a course number and a campus code we do not recognise is
      // a course line we failed to read -- typically outside coursework on a
      // transfer student's record. Filing it as furniture left them with
      // "0 courses understood" and no reason.
      const foreign = FOREIGN_CODE.exec(upper);
      if (foreign?.[1]) {
        rejected.push({
          line: i + 1,
          text: line,
          reason: `"${foreign[1]}" is not a Claremont campus code, so this course could not be read. Add it by hand if it transferred in.`,
        });
        return;
      }

      if (looksLikeTermHeading(line)) {
        headingTerm = null;
        rejected.push({
          line: i + 1,
          text: line,
          reason: "This looks like a term heading but could not be read, so the courses under it have no term.",
        });
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
      rejected.push({ line: i + 1, text: line, reason: `Could not read the grade "${gradeColumn(rest)}".` });
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
  // Registrars label the same heading a dozen ways. Strip the labelling words
  // and punctuation, then read what is left: "Term: Fall 2025", "Fall 2025
  // Semester" and "FALL SEMESTER 2025" are all the same heading.
  const text = line
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/^(TERM|SEMESTER|QUARTER|ACADEMIC TERM)\s*[:.-]?\s*/, "")
    .replace(/\s+(TERM|SEMESTER|QUARTER)\b/g, "")
    .replace(/[:.,]+$/, "")
    .trim();
  const ranged = /^(\d{4})\s*-\s*\d{2,4}\s+([A-Z]+)$/.exec(text);
  if (ranged?.[1] && ranged[2]) {
    const season = SEASONS[ranged[2]];
    if (season) return { year: Number(ranged[1]), term: season };
  }
  const m = /^([A-Z]+)\s*(\d{2}|\d{4})$/.exec(text);
  if (m?.[1] && m[2]) {
    const season = SEASONS[m[1]];
    if (season) return toTerm(season, m[2]);
  }
  // "2025 Fall", the other way round.
  const reversed = /^(\d{4})\s+([A-Z]+)$/.exec(text);
  if (reversed?.[1] && reversed[2]) {
    const season = SEASONS[reversed[2]];
    if (season) return toTerm(season, reversed[1]);
  }
  return null;
}

/**
 * Term-SHAPED: a season word and a year, in a line short enough to be a
 * heading rather than prose that happens to mention a season.
 */
function looksLikeTermHeading(line: string): boolean {
  const text = line.trim().toUpperCase();
  if (text.split(/\s+/).length > 5) return false;
  return /\b(FALL|SPRING|FA|SP)\b/.test(text) && /\b(19|20)\d{2}\b/.test(text);
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
 * The grade, when the line actually carries one.
 *
 * Two rules, both learned from real transcript text:
 *
 * 1. A grade lives in its own COLUMN, so it must be separated by a tab or two
 *    or more spaces. "Spanish for Heritage Speakers A" ends in a lone "A" one
 *    space after the title; that is the title, not an A.
 * 2. A trailing token that is grade-SHAPED but is not a grade is title text,
 *    not an error. "Calculus II", "Calculus I" and "History of US" all end in
 *    grade-shaped tokens, and rejecting those lines threw away three of the
 *    most common courses on any transcript while blaming a grade that was
 *    never there. Grades are optional everywhere in this app (ADR-015), so the
 *    course is kept and the grade is simply left unread.
 */
function findGrade(rest: string): string | null | "invalid" {
  const candidate = gradeColumn(rest);
  if (candidate === null) return null;
  return GRADES.has(candidate) ? candidate : "invalid";
}

/**
 * The trailing token when it sits in a GRADE COLUMN: separated by a tab, a
 * comma, or two or more spaces, or standing as the whole remainder of the line.
 *
 * A single space does not make a column. "Spanish for Heritage Speakers A" and
 * "Modern Europe since 1789 A" end in a lone "A" that is part of the title, and
 * reading it as an A invented a grade the student never typed.
 */
function gradeColumn(rest: string): string | null {
  const m = /(?:^|\t|,\s*| {2,})([A-Z]{1,2}[+-]?)\s*$/.exec(rest.trim());
  return m?.[1] ?? null;
}

function gradeModeFor(grade: string | null): GradeMode | null {
  if (grade === null) return null;
  if (grade === "CR" || grade === "NC") return "creditNoCredit";
  if (grade === "P" || grade === "NP") return "passNoPass";
  return "letter";
}
