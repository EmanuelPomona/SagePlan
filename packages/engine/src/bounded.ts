import { courseKey } from "@gradguide/shared";
import { withMode, type EvalContext } from "./context.ts";
import type { ResolvedCourse } from "./resolvedCourse.ts";
import type { Settlement } from "./rules/settlement.ts";

/**
 * Bounded evaluation under unknowns (docs/API.md 2.7).
 *
 * The app does not ask for terms or grades (ADR-015), so a rule that depends on
 * one is run TWICE: once reading every unknown the way that most helps the
 * student, once the way that least helps. Agreement is the answer and the
 * student is never troubled. Disagreement is `unverifiable`, naming the field
 * and the courses, because the alternative is guessing on a page whose entire
 * argument is that it does not guess.
 *
 * Most students never see this: with no external or transfer credit, including
 * or excluding unknown-term courses gives the same answer for every credit rule.
 */
export function settleBounded(
  settle: (ctx: EvalContext) => Settlement,
  ctx: EvalContext,
  relevant: ResolvedCourse[] = ctx.courses,
): Settlement {
  // One pass is enough when nothing is unknown, which is the common case and
  // the reason this costs nothing for a student who typed their terms.
  if (ctx.unknownTermCourses.length === 0) return settle(ctx);

  const optimistic = settle(withMode(ctx, "optimistic"));
  const pessimistic = settle(withMode(ctx, "pessimistic"));
  if (optimistic.status === pessimistic.status) return optimistic;

  const affected = relevant.filter((c) => c.termUnknown);
  return {
    status: "unverifiable",
    satisfiedBy: [],
    remaining: optimistic.remaining,
    candidates: optimistic.candidates,
    note: missingTermNote(affected.length > 0 ? affected : ctx.unknownTermCourses),
  };
}

/** Says what to add and to which courses, rather than that something is missing. */
function missingTermNote(courses: ResolvedCourse[]): string {
  const keys = [...new Set(courses.map((c) => courseKey(c.completed.course)))].sort();
  const named = keys.slice(0, 4);
  const rest = keys.length - named.length;
  const list =
    named.length === 1
      ? named[0]
      : `${named.slice(0, -1).join(", ")} and ${named.at(-1)}${rest > 0 ? `, and ${rest} more` : ""}`;
  return `Add the term to ${list} so this can be checked. Without it the answer depends on when they were taken.`;
}
