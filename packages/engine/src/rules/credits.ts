import type { Rule } from "@sageplan/shared";
import type { EvalContext } from "../context.ts";
import { countExternalCredits } from "../externalCredit.ts";
import { courseMatchesFilter } from "../filters.ts";
import { byResolved, round2 } from "../ordering.ts";
import type { ResolvedCourse } from "../resolvedCourse.ts";
import type { Settlement } from "./settlement.ts";

export type CreditsRule = Extract<Rule, { kind: "credits" }>;

/**
 * An aggregate rule: it sums over everything that qualifies and never competes
 * for a course, so it takes no part in assignment (docs/API.md 2.3).
 */
export function settleCredits(rule: CreditsRule, ctx: EvalContext): Settlement {
  const notes: string[] = [];
  const caps = rule.caps ?? {};

  const qualifying = ctx.passing
    .filter((c) => courseMatchesFilter(c, rule.filter, ctx))
    .sort(byResolved);

  const partial = qualifying.filter((c) => c.credits < 1);
  const full = qualifying.filter((c) => c.credits >= 1);

  const partialCredits = cappedPartialCredits(partial, caps, notes);

  // The catalog's 16-credit ceiling on work done outside The Claremont Colleges
  // covers transfer coursework and advanced standing together.
  const transferCredits = round2(
    full.filter((c) => c.completed.provenance === "transfer").reduce((sum, c) => sum + c.credits, 0),
  );
  const claremontCredits = round2(
    full.filter((c) => c.completed.provenance !== "transfer").reduce((sum, c) => sum + c.credits, 0),
  );

  const external = includeExternal(rule)
    ? countExternalCredits(ctx.externalCredits, caps)
    : { advancedStanding: 0, notes: [] as string[] };
  notes.push(...external.notes);

  let outsideCredits = round2(transferCredits + external.advancedStanding);
  if (caps.externalCredits !== undefined && outsideCredits > caps.externalCredits) {
    notes.push(`Credit from outside The Claremont Colleges is capped at ${caps.externalCredits}.`);
    outsideCredits = caps.externalCredits;
  }

  const have = round2(claremontCredits + partialCredits + outsideCredits);
  const status = have >= rule.n ? "satisfied" : have > 0 ? "partial" : "unmet";

  return {
    status,
    satisfiedBy: [],
    remaining: { n: round2(Math.max(0, rule.n - have)), unit: "credits" },
    candidates: [],
    ...(notes.length > 0 ? { note: notes.join(" ") } : {}),
  };
}

/** Default: external credit counts when the rule has no filter (docs/API.md 2.2). */
function includeExternal(rule: CreditsRule): boolean {
  return rule.includeExternal ?? rule.filter === undefined;
}

/**
 * Cumulative (partial-credit) courses obey two catalog caps at once: a total
 * credit ceiling and a course-count ceiling. Courses are taken in canonical
 * order so the sum is deterministic.
 */
function cappedPartialCredits(
  partial: ResolvedCourse[],
  caps: { partialCreditCourseCredits?: number; partialCreditCourses?: number },
  notes: string[],
): number {
  const raw = round2(partial.reduce((sum, c) => sum + c.credits, 0));
  const maxCourses = caps.partialCreditCourses;
  const maxCredits = caps.partialCreditCourseCredits;
  if (maxCourses === undefined && maxCredits === undefined) return raw;

  const kept = maxCourses === undefined ? partial : partial.slice(0, maxCourses);
  let total = round2(kept.reduce((sum, c) => sum + c.credits, 0));
  if (maxCredits !== undefined && total > maxCredits) total = maxCredits;

  if (total < raw) {
    notes.push("Partial-credit (cumulative) courses are capped by the catalog.");
  }
  return round2(total);
}
