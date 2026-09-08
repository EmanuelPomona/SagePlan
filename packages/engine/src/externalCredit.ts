import type { CourseId, CreditCaps, ExternalCredit } from "@gradguide/shared";
import { courseKey } from "@gradguide/shared";
import type { EvalContext } from "./context.ts";
import { round2 } from "./ordering.ts";
import type { ResolvedCourse } from "./resolvedCourse.ts";

/**
 * Every attribute granted by an exam is reported against this single pseudo-id,
 * so the UI can render "satisfied by AP Spanish Language (5)" without inventing
 * a fake course. docs/API.md 2.4.
 */
export const EXAM_PSEUDO_ID: CourseId = {
  department: "EXAM",
  courseNumber: 0,
  suffix: "",
  affiliation: "EXT",
};

export const EXAM_PSEUDO_KEY = courseKey(EXAM_PSEUDO_ID);

export function isExamPseudo(course: ResolvedCourse): boolean {
  return course.key === EXAM_PSEUDO_KEY;
}

/**
 * Qualifying exams, expressed as pseudo courses so the assignment step treats a
 * granted attribute exactly like a completed course carrying it.
 *
 * provenance is `transfer`: that is what keeps exam credit out of the Breadth
 * areas, whose filters admit only pomona and claremont work.
 */
export function examGrantCourses(ctx: EvalContext): ResolvedCourse[] {
  const out: ResolvedCourse[] = [];
  for (const ec of ctx.externalCredits) {
    if (!ec.qualifies || ec.grantsAttributes.length === 0) continue;
    out.push(examGrantCourse(ec, ctx));
  }
  return out;
}

function examGrantCourse(ec: ExternalCredit, ctx: EvalContext): ResolvedCourse {
  return {
    completed: {
      course: EXAM_PSEUDO_ID,
      term: ctx.matriculationTerm,
      grade: "CR",
      gradeMode: "creditNoCredit",
      provenance: "transfer",
      title: ec.label,
      credits: ec.credits,
      attributes: ec.grantsAttributes,
    },
    key: EXAM_PSEUDO_KEY,
    credits: ec.credits,
    attributes: ec.grantsAttributes,
    inCatalog: false,
    passing: true,
    letterPoints: null,
  };
}

/** The exam behind a pseudo course, for the note the UI shows. */
export function examLabelFor(course: ResolvedCourse, ctx: EvalContext): string | undefined {
  if (!isExamPseudo(course)) return undefined;
  return ctx.externalCredits.find((ec) => ec.label === course.completed.title)?.label;
}

/**
 * Advanced-standing credit actually countable from a set of exams.
 *
 * docs/API.md 2.4, in order: one credit per duplicateKey (the largest), then
 * caps.advancedStandingCredits. The caps.externalCredits ceiling is applied
 * later, by the credits rule, because it is shared with transfer coursework.
 */
export function countExternalCredits(
  credits: ExternalCredit[],
  caps: CreditCaps,
): { advancedStanding: number; notes: string[] } {
  const notes: string[] = [];

  const largestPerDuplicate = new Map<string, number>();
  let duplicatesDropped = 0;
  for (const ec of [...credits].sort((a, b) => (a.subjectKey < b.subjectKey ? -1 : a.subjectKey > b.subjectKey ? 1 : 0))) {
    if (!ec.qualifies || ec.credits <= 0) continue;
    const seen = largestPerDuplicate.get(ec.duplicateKey);
    if (seen === undefined) {
      largestPerDuplicate.set(ec.duplicateKey, ec.credits);
    } else {
      duplicatesDropped += 1;
      if (ec.credits > seen) largestPerDuplicate.set(ec.duplicateKey, ec.credits);
    }
  }
  if (duplicatesDropped > 0) {
    notes.push(`${duplicatesDropped} duplicate exam${duplicatesDropped === 1 ? "" : "s"} earned credit only once.`);
  }

  const raw = round2([...largestPerDuplicate.values()].reduce((sum, c) => sum + c, 0));
  const cap = caps.advancedStandingCredits;
  if (cap !== undefined && raw > cap) {
    notes.push(`Advanced standing credit is capped at ${cap}.`);
    return { advancedStanding: cap, notes };
  }
  return { advancedStanding: raw, notes };
}
