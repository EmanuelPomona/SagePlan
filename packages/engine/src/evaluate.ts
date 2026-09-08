import type { Course, Program, Requirement, Result, StudentPlan } from "@gradguide/shared";
import { courseKey } from "@gradguide/shared";
import { assignCourses, isCourseSelecting } from "./assignment.ts";
import { buildContext, type EvalContext } from "./context.ts";
import { blockedByDistinctDepartments, constraintViolations, type Assignment } from "./constraints.ts";
import { attestationFor, overrideFor, waiverFor } from "./manual.ts";
import { mayShare } from "./overlap.ts";
import { eligibleCourses, settleAttribute } from "./rules/attribute.ts";
import { settleAttested } from "./rules/attested.ts";
import { eligibleForCourseRule, settleCourse } from "./rules/course.ts";
import { settleCredits } from "./rules/credits.ts";
import { settleDeferred } from "./rules/deferred.ts";
import { settleGpa } from "./rules/gpa.ts";
import type { Settlement } from "./rules/settlement.ts";
import type { ResolvedCourse } from "./resolvedCourse.ts";

/**
 * The engine's only entry point for requirements.
 *
 * Pure and deterministic: same inputs, byte-identical output (docs/API.md 2.6).
 * Never throws on schema-valid input — an unknown course, an unimplemented rule
 * kind or a malformed override becomes a Result, not an exception.
 */
export function evaluate(plan: StudentPlan, programs: Program[], catalog: Course[]): Result[] {
  const ctx = buildContext(plan, catalog);
  const results: Result[] = [];
  for (const program of programs) results.push(...evaluateProgram(plan, program, ctx));
  return results;
}

function evaluateProgram(plan: StudentPlan, program: Program, ctx: EvalContext): Result[] {
  // 1. Manual results first: they neither need nor take part in assignment.
  const manual = new Map<string, Settlement>();
  for (const req of program.requirements) {
    const settled = waiverFor(req, plan) ?? overrideFor(req, plan) ?? attestationFor(req, plan);
    if (settled) manual.set(req.id, settled);
  }

  // 2. Eligibility for everything still to be decided automatically.
  const automatic = program.requirements.filter((r) => !manual.has(r.id));
  const eligible = new Map<string, ResolvedCourse[]>();
  for (const req of automatic) {
    eligible.set(req.id, eligibleFor(req, ctx));
  }
  reserveOverriddenCourses(program, plan, eligible);

  // 3. Constrained-first assignment over the course-selecting requirements.
  const { assignment, bounded } = assignCourses(automatic, eligible, program, ctx);
  seedManualAssignments(program, manual, assignment, ctx);

  const violations = constraintViolations(program, assignment);
  addBlockedRequirements(program, automatic, eligible, assignment, violations);
  const used = usedKeys(assignment);

  // 4. Settle every requirement and stamp the shared fields.
  return program.requirements.map((req) => {
    const settlement = manual.get(req.id) ?? settleRule(req, assignment.get(req.id) ?? [], ctx, used);
    const flags = manualFlags(req, plan, manual.has(req.id));
    const reqViolations = violations.get(req.id);
    const note = noteFor(settlement, reqViolations, bounded);

    return {
      programId: program.id,
      requirementId: req.id,
      status: settlement.status,
      satisfiedBy: settlement.satisfiedBy,
      remaining: settlement.remaining,
      candidates: settlement.candidates,
      children: [],
      ...flags,
      confidence: req.confidence ?? program.confidence,
      ...(note ? { note } : {}),
      ...(reqViolations && reqViolations.length > 0 ? { violations: reqViolations } : {}),
    };
  });
}

function settleRule(
  req: Requirement,
  assigned: ResolvedCourse[],
  ctx: EvalContext,
  used: ReadonlySet<string>,
): Settlement {
  switch (req.rule.kind) {
    case "course":
      return settleCourse(req.rule, assigned, ctx);
    case "attribute":
      return settleAttribute(req.rule, assigned, ctx, used);
    case "credits":
      return settleCredits(req.rule, ctx);
    case "gpa":
      return settleGpa(req.rule, ctx);
    case "attested":
      return settleAttested(req.rule, ctx);
    default:
      return settleDeferred(req.rule.kind);
  }
}

function eligibleFor(req: Requirement, ctx: EvalContext): ResolvedCourse[] {
  if (req.rule.kind === "course") return eligibleForCourseRule(req.rule, ctx);
  if (req.rule.kind === "attribute") return eligibleCourses(req.rule, ctx);
  return [];
}

/**
 * An overridden course is taken out of the pool for requirements that may not
 * share with the overridden one (docs/API.md 2.4).
 */
function reserveOverriddenCourses(
  program: Program,
  plan: StudentPlan,
  eligible: Map<string, ResolvedCourse[]>,
): void {
  const byId = new Map(program.requirements.map((r) => [r.id, r]));
  for (const override of plan.overrides) {
    const owner = byId.get(override.requirementId);
    if (!owner) continue; // an override naming no requirement is ignored, never thrown
    const key = courseKey(override.course);
    for (const other of program.requirements) {
      if (other.id === owner.id || mayShare(owner, other)) continue;
      const pool = eligible.get(other.id);
      if (pool) eligible.set(other.id, pool.filter((c) => c.key !== key));
    }
  }
}

/** Manual results still occupy their course for constraint purposes. */
function seedManualAssignments(
  program: Program,
  manual: Map<string, Settlement>,
  assignment: Assignment,
  ctx: EvalContext,
): void {
  for (const req of program.requirements) {
    const settled = manual.get(req.id);
    if (!settled || settled.satisfiedBy.length === 0) continue;
    const held = settled.satisfiedBy
      .map((id) => ctx.courses.find((c) => c.key === courseKey(id)))
      .filter((c): c is ResolvedCourse => c !== undefined);
    if (held.length > 0) assignment.set(req.id, held);
  }
}

function manualFlags(
  req: Requirement,
  plan: StudentPlan,
  isManual: boolean,
): { waived?: boolean; viaOverride?: boolean; viaAttestation?: boolean } {
  if (!isManual) return {};
  if (waiverFor(req, plan)) return { waived: true };
  if (overrideFor(req, plan)) return { viaOverride: true };
  if (attestationFor(req, plan)) return { viaAttestation: true };
  return {};
}

function noteFor(settlement: Settlement, violations: string[] | undefined, bounded: boolean): string | undefined {
  const parts: string[] = [];
  if (settlement.note) parts.push(settlement.note);
  if (violations && violations.length > 0) {
    parts.push("No two Breadth areas may be satisfied by courses from the same department.");
  }
  if (bounded) parts.push("assignment search bounded");
  return parts.length > 0 ? parts.join(" ") : undefined;
}

/**
 * A requirement the search could not close because a distinctDepartments group
 * already spent its department is reported as such, not left silently unmet.
 */
function addBlockedRequirements(
  program: Program,
  automatic: Requirement[],
  eligible: Map<string, ResolvedCourse[]>,
  assignment: Assignment,
  violations: Map<string, string[]>,
): void {
  for (const req of automatic) {
    if (!isCourseSelecting(req)) continue;
    if ((assignment.get(req.id) ?? []).length > 0) continue;
    if (!blockedByDistinctDepartments(program, req.id, eligible.get(req.id) ?? [], assignment)) continue;

    const list = violations.get(req.id) ?? [];
    if (!list.includes("distinctDepartments")) list.push("distinctDepartments");
    violations.set(req.id, list);
  }
}

function usedKeys(assignment: Assignment): Set<string> {
  const keys = new Set<string>();
  for (const courses of assignment.values()) for (const c of courses) keys.add(c.key);
  return keys;
}
