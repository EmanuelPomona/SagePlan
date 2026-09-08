import { z } from "zod";

/**
 * Identity types. Decomposed, never a bare string, copied from Hyperschedule
 * because it solves cross-listing cleanly. `courseKey()` is the ONLY canonical
 * string form and is what appears in URLs, share links and golden files.
 */

export const AffiliationSchema = z
  .string()
  .regex(/^[A-Z]{2,3}$/)
  .meta({
    id: "Affiliation",
    description:
      "Campus / affiliation code as used by Hyperschedule and the Registrar (PO, HM, SC, CM, PZ, AF, KS, JP, CH, JT, AA, JM, BK). EXT marks a course from an external institution that is not in the catalog (transfer, or non-Pomona study abroad).",
  });
export type Affiliation = z.infer<typeof AffiliationSchema>;

export const CourseIdSchema = z
  .object({
    department: z.string().regex(/^[A-Z]{2,5}$/).describe('Subject code, e.g. "CSCI". Also the department that offers the course for Breadth purposes.'),
    courseNumber: z.number().int().min(0).max(999).describe("Numeric part of the course number, e.g. 62."),
    suffix: z.string().regex(/^[A-Z0-9]{0,3}$/).describe('Letter suffix, e.g. "A", or "" when none.'),
    affiliation: AffiliationSchema,
  })
  .meta({ id: "CourseId", description: 'Decomposed course identity. Canonical string form is courseKey(): "CSCI 062A PO".' });
export type CourseId = z.infer<typeof CourseIdSchema>;

/** "CSCI 062A PO" / "ID 001 PO". Three-digit zero-padded number, suffix attached, one space, affiliation. */
export function courseKey(id: CourseId): string {
  return `${id.department} ${String(id.courseNumber).padStart(3, "0")}${id.suffix} ${id.affiliation}`;
}

const COURSE_KEY_RE = /^([A-Z]{2,5})\s+(\d{1,3})([A-Z0-9]{0,3})\s+([A-Z]{2,3})$/;

export function parseCourseKey(key: string): CourseId | null {
  const m = COURSE_KEY_RE.exec(key.trim().toUpperCase());
  if (!m) return null;
  return { department: m[1]!, courseNumber: Number(m[2]), suffix: m[3] ?? "", affiliation: m[4]! };
}

export function sameCourse(a: CourseId, b: CourseId): boolean {
  return (
    a.department === b.department &&
    a.courseNumber === b.courseNumber &&
    a.suffix === b.suffix &&
    a.affiliation === b.affiliation
  );
}

export const TermSeasonSchema = z.enum(["FA", "SP"]).meta({ id: "TermSeason" });
export type TermSeason = z.infer<typeof TermSeasonSchema>;

export const TermIdSchema = z
  .object({
    year: z.number().int().min(2000).max(2100).describe("Calendar year in which the term starts (FA2026 starts in 2026; SP2027 starts in 2027)."),
    term: TermSeasonSchema,
  })
  .meta({ id: "TermId", description: 'Academic term. Canonical string form is termCode(): "FA2026".' });
export type TermId = z.infer<typeof TermIdSchema>;

export const TermCodeSchema = z.string().regex(/^(FA|SP)\d{4}$/).meta({ id: "TermCode", description: 'Term as a string, Hyperschedule style: "FA2026", "SP2027". Used in artefact file names.' });
export type TermCode = z.infer<typeof TermCodeSchema>;

export function termCode(t: TermId): TermCode {
  return `${t.term}${t.year}`;
}

export function parseTermCode(code: string): TermId | null {
  const m = /^(FA|SP)(\d{4})$/.exec(code.trim().toUpperCase());
  if (!m) return null;
  return { term: m[1] as TermSeason, year: Number(m[2]) };
}

/** Chronological order. SP2026 (January) precedes FA2026 (September). */
export function compareTerms(a: TermId, b: TermId): number {
  if (a.year !== b.year) return a.year - b.year;
  const order = { SP: 0, FA: 1 } as const;
  return order[a.term] - order[b.term];
}

export function sameTerm(a: TermId, b: TermId): boolean {
  return a.year === b.year && a.term === b.term;
}

/** "2026-2027" */
export const CatalogYearSchema = z.string().regex(/^\d{4}-\d{4}$/).meta({ id: "CatalogYear", description: 'Catalog edition, e.g. "2026-2027".' });
export type CatalogYear = z.infer<typeof CatalogYearSchema>;

export const GeAttributeSchema = z
  .enum([
    "AREA_1", "AREA_2", "AREA_3", "AREA_4", "AREA_5", "AREA_6",
    "WRITING_INTENSIVE", "SPEAKING_INTENSIVE", "ANALYZING_DIFFERENCE",
    "LANGUAGE", "PHYSICAL_EDUCATION", "COMMUNITY_PARTNERSHIP",
  ])
  .meta({ id: "GeAttribute", description: "Pomona general-education attribute a course carries, as tagged by the Registrar. Hyperschedule codes 1A1..1A6, 1WIR, 1SIR, 1ADR, 1FL, 1PE, 1CP map onto these." });
export type GeAttribute = z.infer<typeof GeAttributeSchema>;

/** Hyperschedule course-area code -> GeAttribute. Pomona's codes are prefixed with campus 1. */
export const HYPERSCHEDULE_GE_CODES: Readonly<Record<string, GeAttribute>> = {
  "1A1": "AREA_1", "1A2": "AREA_2", "1A3": "AREA_3", "1A4": "AREA_4", "1A5": "AREA_5", "1A6": "AREA_6",
  "1WIR": "WRITING_INTENSIVE", "1SIR": "SPEAKING_INTENSIVE", "1ADR": "ANALYZING_DIFFERENCE",
  "1FL": "LANGUAGE", "1PE": "PHYSICAL_EDUCATION", "1CP": "COMMUNITY_PARTNERSHIP",
};

/** Registrar CSV "Breadth Area" labels -> GeAttribute. */
export const REGISTRAR_GE_LABELS: Readonly<Record<string, GeAttribute>> = {
  "Area 1": "AREA_1", "Area 2": "AREA_2", "Area 3": "AREA_3", "Area 4": "AREA_4", "Area 5": "AREA_5", "Area 6": "AREA_6",
  "Writing Intensive": "WRITING_INTENSIVE", "Speaking Intensive": "SPEAKING_INTENSIVE",
  "Analyzing Difference": "ANALYZING_DIFFERENCE", "Language Requirement": "LANGUAGE",
  "Physical Education": "PHYSICAL_EDUCATION",
};
