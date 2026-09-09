import type { Course, ExternalCredit, StudentPlan, StudentType, TermId } from "@gradguide/shared";
import { courseKey } from "@gradguide/shared";
import { resolveCompleted, type ResolvedCourse } from "./resolvedCourse.ts";

/** Everything the rule evaluators read. Built once per evaluate() call. */
export type EvalContext = {
  plan: StudentPlan;
  studentType: StudentType;
  matriculationTerm: TermId;
  /** Every completed course, resolved. Includes non-passing ones; rules filter on `passing`. */
  courses: ResolvedCourse[];
  /** The passing subset, which is all any requirement may count. */
  passing: ResolvedCourse[];
  externalCredits: ExternalCredit[];
  catalog: Course[];
  catalogByKey: Map<string, Course>;
};

export function buildContext(plan: StudentPlan, catalog: Course[]): EvalContext {
  const catalogByKey = new Map<string, Course>();
  for (const course of catalog) catalogByKey.set(courseKey(course.id), course);

  const courses = plan.completed.map((c) => resolveCompleted(c, catalogByKey.get(courseKey(c.course))));

  return {
    plan,
    studentType: plan.studentType,
    matriculationTerm: plan.matriculationTerm,
    courses,
    passing: courses.filter((c) => c.passing),
    externalCredits: plan.externalCredits,
    catalog,
    catalogByKey,
  };
}
