import type { CourseId, Rule } from "@gradguide/shared";
import { courseKey, termCode } from "@gradguide/shared";
import type { EvalContext } from "../context.ts";
import { examGrantCourses, isExamPseudo } from "../externalCredit.ts";
import { courseMatchesFilter } from "../filters.ts";
import { byResolved, round2, sortIds } from "../ordering.ts";
import type { ResolvedCourse } from "../resolvedCourse.ts";
import type { Settlement } from "./settlement.ts";

export type AttributeRule = Extract<Rule, { kind: "attribute" }>;

/**
 * Completed courses (and qualifying exam grants) that could count toward this
 * rule. The assignment step decides which of them actually do.
 */
export function eligibleCourses(rule: AttributeRule, ctx: EvalContext): ResolvedCourse[] {
  const candidates = [...ctx.passing, ...examGrantCourses(ctx)];
  return candidates
    .filter((c) => c.attributes.includes(rule.attr) && courseMatchesFilter(c, rule.filter, ctx))
    .sort(byResolved);
}

export function settleAttribute(
  rule: AttributeRule,
  assigned: ResolvedCourse[],
  ctx: EvalContext,
  used: ReadonlySet<string> = new Set(),
  eligible: ResolvedCourse[] = assigned,
): Settlement {
  const unit = rule.unit ?? "courses";
  let counted = assigned;
  let note: string | undefined;

  if (rule.distinctTerms) {
    const seenTerms = new Set<string>();
    counted = assigned.filter((c) => {
      const t = termCode(c.completed.term);
      if (seenTerms.has(t)) return false;
      seenTerms.add(t);
      return true;
    });
    if (counted.length < assigned.length) {
      note = "These courses must be taken in different semesters; only one of the courses taken in the same semester counts.";
    }
  }

  const have = unit === "credits" ? round2(counted.reduce((sum, c) => sum + c.credits, 0)) : counted.length;
  const status = have >= rule.n ? "satisfied" : have > 0 ? "partial" : "unmet";

  // The assignment already dropped same-term duplicates, so the shortfall is
  // only explicable from the eligible set: the student HAS another course, it
  // just falls in a semester that is already counted.
  if (!note && rule.distinctTerms && status !== "satisfied" && sharesTermWithCounted(eligible, counted)) {
    note = "These courses must be taken in different semesters, and another course you have taken falls in a semester that already counts.";
  }
  const exams = counted.filter(isExamPseudo).map((c) => c.completed.title).filter(Boolean);
  if (exams.length > 0) {
    const claim = status === "satisfied" ? `Satisfied by ${exams.join(", ")}.` : `Counting ${exams.join(", ")}.`;
    note = note ? `${note} ${claim}` : claim;
  }

  return {
    status,
    satisfiedBy: sortIds(counted.map((c) => c.completed.course)),
    remaining: { n: round2(Math.max(0, rule.n - have)), unit },
    candidates: status === "satisfied" ? [] : candidatesFor(rule, ctx, used),
    ...(note ? { note } : {}),
  };
}

function sharesTermWithCounted(eligible: ResolvedCourse[], counted: ResolvedCourse[]): boolean {
  const countedKeys = new Set(counted.map((c) => c.key));
  const countedTerms = new Set(counted.map((c) => termCode(c.completed.term)));
  return eligible.some((c) => !countedKeys.has(c.key) && countedTerms.has(termCode(c.completed.term)));
}

/** Catalog courses carrying the attribute that the student has not taken. */
function candidatesFor(rule: AttributeRule, ctx: EvalContext, used: ReadonlySet<string>): CourseId[] {
  const onRecord = new Set(ctx.courses.map((c) => c.key));
  const filter = rule.filter;
  const out: CourseId[] = [];
  for (const course of ctx.catalog) {
    if (!course.attributes.includes(rule.attr)) continue;
    // The catalog-checkable half of the filter. provenance and term fields
    // describe a course the student has TAKEN, so they cannot narrow a
    // catalog listing and are deliberately not applied here.
    if (filter?.attributes && !filter.attributes.every((a) => course.attributes.includes(a))) continue;
    if (filter?.partialCredit === "exclude" && course.credits.min < 1) continue;
    const key = courseKey(course.id);
    if (onRecord.has(key) || used.has(key)) continue;
    out.push(course.id);
  }
  return sortIds(out);
}
