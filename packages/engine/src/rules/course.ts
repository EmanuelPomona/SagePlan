import type { Rule } from "@gradguide/shared";
import { gradeAtLeast, sameCourse } from "@gradguide/shared";
import type { EvalContext } from "../context.ts";
import { byResolved, sortIds } from "../ordering.ts";
import type { ResolvedCourse } from "../resolvedCourse.ts";
import type { Settlement } from "./settlement.ts";

export type CourseRule = Extract<Rule, { kind: "course" }>;

/** The named course, if the student passed it (and met minGrade, when set). */
export function eligibleForCourseRule(rule: CourseRule, ctx: EvalContext): ResolvedCourse[] {
  return ctx.passing
    .filter((c) => sameCourse(c.completed.course, rule.course))
    // A minGrade needs a grade. An unrecorded grade means "passed", which is
    // not the same as "passed well enough", so it cannot satisfy a minimum.
    .filter((c) => rule.minGrade === undefined || (c.completed.grade !== null && gradeAtLeast(c.completed.grade, rule.minGrade)))
    .sort(byResolved);
}

export function settleCourse(rule: CourseRule, assigned: ResolvedCourse[], _ctx: EvalContext): Settlement {
  const satisfied = assigned.length > 0;
  return {
    status: satisfied ? "satisfied" : "unmet",
    satisfiedBy: satisfied ? sortIds([assigned[0]!.completed.course]) : [],
    remaining: null,
    candidates: satisfied ? [] : [rule.course],
  };
}
