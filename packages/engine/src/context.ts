import type { Course, ExternalCredit, StudentPlan, StudentType, TermId } from "@gradguide/shared";
import { compareTerms, courseKey } from "@gradguide/shared";
import { resolveCompleted, type ResolvedCourse } from "./resolvedCourse.ts";

/**
 * How an unknown field is resolved during one evaluation pass (docs/API.md 2.7).
 * `optimistic` reads every unknown the way that most helps the student,
 * `pessimistic` the way that least helps. A rule whose two passes disagree is
 * reported `unverifiable` rather than guessed at.
 */
export type EvalMode = "optimistic" | "pessimistic";

export type EvalContext = {
  plan: StudentPlan;
  studentType: StudentType;
  /** Inferred from the earliest known course term when the plan does not say. */
  matriculationTerm: TermId | null;
  courses: ResolvedCourse[];
  /** The passing subset, which is all any requirement may count. */
  passing: ResolvedCourse[];
  externalCredits: ExternalCredit[];
  catalog: Course[];
  catalogByKey: Map<string, Course>;
  mode: EvalMode;
  /** Courses whose term the student has not recorded. Empty means one pass suffices. */
  unknownTermCourses: ResolvedCourse[];
};

export function buildContext(plan: StudentPlan, catalog: Course[], mode: EvalMode = "optimistic"): EvalContext {
  const catalogByKey = new Map<string, Course>();
  for (const course of catalog) catalogByKey.set(courseKey(course.id), course);

  const courses = plan.completed.map((c) => resolveCompleted(c, catalogByKey.get(courseKey(c.course))));

  return {
    plan,
    studentType: plan.studentType,
    matriculationTerm: inferMatriculationTerm(plan, courses),
    courses,
    passing: courses.filter((c) => c.passing),
    externalCredits: plan.externalCredits,
    catalog,
    catalogByKey,
    mode,
    unknownTermCourses: courses.filter((c) => c.termUnknown),
  };
}

/**
 * The profile no longer asks when the student matriculated (ADR-015), so it is
 * read off the record: the earliest term they have told us about. With no terms
 * at all it stays null and the two passes decide.
 */
export function inferMatriculationTerm(plan: StudentPlan, courses: ResolvedCourse[]): TermId | null {
  if (plan.matriculationTerm !== null) return plan.matriculationTerm;

  let earliest: TermId | null = null;
  for (const course of courses) {
    const term = course.completed.term;
    if (term === null) continue;
    if (earliest === null || compareTerms(term, earliest) < 0) earliest = term;
  }
  return earliest;
}

/** A second context over the same plan, reading unknowns the other way. */
export function withMode(ctx: EvalContext, mode: EvalMode): EvalContext {
  return { ...ctx, mode };
}
