import type { Requirement, StudentPlan } from "@gradguide/shared";
import type { Settlement } from "./rules/settlement.ts";

/**
 * Results a human asserted rather than the engine derived. They must never look
 * like an automatic match in the UI, so each carries its own flag and note.
 */

/** `appliesWhen` excludes this student: satisfied, waived, and consuming nothing. */
export function waiverFor(req: Requirement, plan: StudentPlan): Settlement | null {
  const applies = req.appliesWhen?.studentType;
  if (!applies || applies.includes(plan.studentType)) return null;

  const audience = applies.length === 1 && applies[0] === "firstYear" ? "students who entered as first-years" : `students of type ${applies.join(", ")}`;
  return {
    status: "satisfied",
    satisfiedBy: [],
    remaining: null,
    candidates: [],
    note: `This requirement applies only to ${audience}, so it does not apply to you.`,
  };
}

/** A chair-granted substitution wins over the rule (docs/API.md 2.4). */
export function overrideFor(req: Requirement, plan: StudentPlan): Settlement | null {
  const override = plan.overrides.find((o) => o.requirementId === req.id);
  if (!override) return null;

  return {
    status: "satisfied",
    satisfiedBy: [override.course],
    remaining: null,
    candidates: [],
    note: `Substitution approved by ${override.approvedBy}: ${override.reason}`,
  };
}

/** The student self-certified an `attestable` requirement. */
export function attestationFor(req: Requirement, plan: StudentPlan): Settlement | null {
  if (!req.attestable || plan.attestations[req.id] !== true) return null;

  return {
    status: "satisfied",
    satisfiedBy: [],
    remaining: null,
    candidates: [],
    note: req.attestable.prompt,
  };
}
