import type { CourseFilter } from "@gradguide/shared";
import { compareTerms } from "@gradguide/shared";
import type { EvalContext } from "./context.ts";
import { isExamPseudo } from "./externalCredit.ts";
import type { ResolvedCourse } from "./resolvedCourse.ts";

/**
 * docs/API.md 2.2: every present field of a CourseFilter must hold (AND).
 * An absent filter matches everything.
 *
 * Term-dependent fields are three-valued now that a term may be unrecorded
 * (docs/API.md 2.7). An unknown answer is resolved by the pass we are in:
 * optimistically it counts, pessimistically it does not. Nothing here guesses
 * on its own; disagreement between the passes is what produces `unverifiable`.
 */
export function courseMatchesFilter(
  course: ResolvedCourse,
  filter: CourseFilter | undefined,
  ctx: EvalContext,
): boolean {
  if (!filter) return true;

  if (filter.provenance && !filter.provenance.includes(course.completed.provenance)) {
    if (!admittedByTransferPolicy(course, filter, ctx)) return false;
  }

  if (filter.attributes && !filter.attributes.every((a) => course.attributes.includes(a))) return false;

  if (filter.minTerm) {
    const term = course.completed.term;
    if (term === null) {
      if (!favourable(ctx)) return false;
    } else if (compareTerms(term, filter.minTerm) < 0) {
      return false;
    }
  }

  if (filter.sinceMatriculation) {
    // "External credit never counts under this filter" (docs/API.md 2.2).
    if (isExamPseudo(course)) return false;
    const term = course.completed.term;
    if (term === null || ctx.matriculationTerm === null) {
      // docs/API.md 2.7 as written: an unrecorded term is mode-dependent for
      // every course, not only for work from outside. See the CONTRACT CHANGE
      // REQUEST in docs/handoffs/agent-frontend.md: the literal reading means a
      // student who records no terms gets `unverifiable` on this rule, which is
      // the default record ADR-015 created. Implemented as written rather than
      // quietly refined.
      if (!favourable(ctx)) return false;
    } else if (compareTerms(term, ctx.matriculationTerm) < 0) {
      return false;
    }
  }

  if (filter.partialCredit === "exclude" && course.credits < 1) return false;

  return true;
}

/** In the optimistic pass an unknown counts; in the pessimistic pass it does not. */
function favourable(ctx: EvalContext): boolean {
  return ctx.mode === "optimistic";
}


function admittedByTransferPolicy(course: ResolvedCourse, filter: CourseFilter, ctx: EvalContext): boolean {
  if (filter.transferPolicy !== "transferStudentsPreMatriculation") return false;
  if (course.completed.provenance !== "transfer") return false;
  if (ctx.studentType !== "transfer") return false;

  const term = course.completed.term;
  if (term === null || ctx.matriculationTerm === null) return favourable(ctx);
  return compareTerms(term, ctx.matriculationTerm) < 0;
}
