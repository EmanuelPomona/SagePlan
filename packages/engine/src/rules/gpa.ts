import type { Rule } from "@sageplan/shared";
import type { EvalContext } from "../context.ts";
import type { Settlement } from "./settlement.ts";

export type GpaRule = Extract<Rule, { kind: "gpa" }>;

/** Provenances whose letter grades enter the Pomona GPA. Transfer work does not. */
const GPA_PROVENANCES = new Set(["pomona", "claremont", "abroad"]);

/**
 * Aggregate rule. Credit-weighted over letter-graded work only; CR/NC, P/NP and
 * transfer grades are excluded. With no letter grades the answer is
 * `unverifiable`, never a 0.0 that would read as a failing student (F-12).
 */
export function settleGpa(rule: GpaRule, ctx: EvalContext): Settlement {
  if (rule.scope === "program") {
    // The engine has no notion of which courses belong to a program, so it
    // cannot answer this. Saying "unverifiable" is the only safe answer:
    // returning the OVERALL average here would silently approve or fail a
    // major on the wrong number. See the contract change request in
    // docs/handoffs/agent-frontend.md.
    return {
      status: "unverifiable",
      satisfiedBy: [],
      remaining: null,
      candidates: [],
      note: "A grade point average within a program is not evaluated yet, because the engine cannot yet tell which courses count toward a program.",
    };
  }

  const graded = ctx.courses.filter(
    (c) => c.letterPoints !== null && GPA_PROVENANCES.has(c.completed.provenance),
  );

  if (graded.length === 0) {
    return {
      status: "unverifiable",
      satisfiedBy: [],
      remaining: null,
      candidates: [],
      note: "No letter grades on the record yet, so a grade point average cannot be computed.",
    };
  }

  const points = graded.reduce((sum, c) => sum + (c.letterPoints ?? 0) * c.credits, 0);
  const credits = graded.reduce((sum, c) => sum + c.credits, 0);

  if (credits === 0) {
    // Zero-credit courses are schema-valid. Dividing by their total produced
    // NaN, and NaN >= min is false, so a passing record came back as a failing
    // grade point average.
    return {
      status: "unverifiable",
      satisfiedBy: [],
      remaining: null,
      candidates: [],
      note: "No credit-bearing letter grades on the record yet, so a grade point average cannot be computed.",
    };
  }

  const gpa = Math.round((points / credits) * 100) / 100;

  return {
    status: gpa >= rule.min ? "satisfied" : "unmet",
    satisfiedBy: [],
    remaining: null,
    candidates: [],
    note: `Grade point average ${gpa.toFixed(2)} over ${credits} graded credits.`,
  };
}
