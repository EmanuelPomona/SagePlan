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

  // Both passes share one collector, so afterwards it holds exactly the courses
  // whose unknown field a pass had to decide.
  const decided = new Set<string>();
  const optimistic = settle(withMode(ctx, "optimistic", decided));
  const pessimistic = settle(withMode(ctx, "pessimistic", decided));

  if (optimistic.status === pessimistic.status) {
    // Agreeing on the status is not agreeing on the numbers. Returning the
    // optimistic settlement wholesale printed the friendlier remainder as a
    // fact: "27 credits to go" when the pessimistic reading of the same record
    // says 28. The status stands -- docs/API.md 2.7 asks only that the two
    // passes agree on it -- but the student is told the figure is not settled.
    const optimisticN = optimistic.remaining?.n;
    const pessimisticN = pessimistic.remaining?.n;
    if (optimisticN !== undefined && pessimisticN !== undefined && optimisticN !== pessimisticN) {
      return { ...optimistic, note: rangeNote(optimisticN, pessimisticN, unknownsBehind(ctx, relevant, decided)) };
    }
    return optimistic;
  }

  const affected = unknownsBehind(ctx, relevant, decided);
  return {
    status: "unverifiable",
    satisfiedBy: [],
    remaining: optimistic.remaining,
    candidates: optimistic.candidates,
    note: missingTermNote(affected),
  };
}

/** The unknown-term courses a pass actually had to decide, for naming in a note. */
function unknownsBehind(ctx: EvalContext, relevant: ResolvedCourse[], decided: Set<string>): ResolvedCourse[] {
  const affected = relevant.filter((c) => c.termUnknown && decided.has(c.key));
  return affected.length > 0 ? affected : ctx.unknownTermCourses;
}

/** Both readings of a figure the record does not settle, with what would settle it. */
function rangeNote(optimistic: number, pessimistic: number, courses: ResolvedCourse[]): string {
  const low = Math.min(optimistic, pessimistic);
  const high = Math.max(optimistic, pessimistic);
  const keys = [...new Set(courses.map((c) => courseKey(c.completed.course)))].sort();
  const named = keys.slice(0, 3).join(", ");
  return `This is between ${low} and ${high} depending on when ${named || "some courses"} ${keys.length === 1 ? "was" : "were"} taken.`;
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
