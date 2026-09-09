import type { Rule } from "@gradguide/shared";
import type { EvalContext } from "../context.ts";
import type { Settlement } from "./settlement.ts";

export type AttestedRule = Extract<Rule, { kind: "attested" }>;

/**
 * The student's own word, keyed by the rule id. Until they give it the answer is
 * `unverifiable` and the UI shows the prompt rather than guessing.
 */
export function settleAttested(rule: AttestedRule, ctx: EvalContext): Settlement {
  const confirmed = ctx.plan.attestations[rule.id] === true;
  return {
    status: confirmed ? "satisfied" : "unverifiable",
    satisfiedBy: [],
    remaining: null,
    candidates: [],
    note: rule.prompt,
  };
}
