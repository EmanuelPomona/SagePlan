import type { CourseFilter } from "@gradguide/shared";
import { compareTerms } from "@gradguide/shared";
import type { EvalContext } from "./context.ts";
import { isExamPseudo } from "./externalCredit.ts";
import type { ResolvedCourse } from "./resolvedCourse.ts";

/**
 * docs/API.md section 2.2: every present field of a CourseFilter must hold (AND).
 * An absent filter matches everything.
 */
export function courseMatchesFilter(
  course: ResolvedCourse,
  filter: CourseFilter | undefined,
  ctx: EvalContext,
): boolean {
  if (!filter) return true;

  if (filter.provenance && !filter.provenance.includes(course.completed.provenance)) {
    // transferPolicy is the single escape hatch: the catalog lets a TRANSFER
    // student count transfer work taken BEFORE they matriculated toward Breadth
    // and the overlays, even though `provenance` would otherwise exclude it.
    if (!admittedByTransferPolicy(course, filter, ctx)) return false;
  }

  if (filter.attributes && !filter.attributes.every((a) => course.attributes.includes(a))) return false;

  if (filter.minTerm && compareTerms(course.completed.term, filter.minTerm) < 0) return false;

  if (filter.sinceMatriculation) {
    // "External credit never counts under this filter" (docs/API.md 2.2).
    if (isExamPseudo(course)) return false;
    if (compareTerms(course.completed.term, ctx.matriculationTerm) < 0) return false;
  }

  if (filter.partialCredit === "exclude" && course.credits < 1) return false;

  return true;
}

function admittedByTransferPolicy(course: ResolvedCourse, filter: CourseFilter, ctx: EvalContext): boolean {
  return (
    filter.transferPolicy === "transferStudentsPreMatriculation" &&
    course.completed.provenance === "transfer" &&
    ctx.studentType === "transfer" &&
    compareTerms(course.completed.term, ctx.matriculationTerm) < 0
  );
}
