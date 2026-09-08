import type { CourseId, ExternalCredit } from "@gradguide/shared";
import { courseKey } from "@gradguide/shared";
import type { EvalContext } from "./context.ts";
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
