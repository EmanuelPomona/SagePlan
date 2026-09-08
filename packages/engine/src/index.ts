/**
 * @gradguide/engine — the requirement evaluator.
 *
 * Pure, deterministic, no I/O and no DOM: it runs identically under vitest in
 * Node and in the browser. The contract is docs/API.md section 2.
 */
export { evaluate } from "./evaluate.ts";
export { resolveExternalCredit, countExternalCredits, EXAM_PSEUDO_ID } from "./externalCredit.ts";
export { mayShare } from "./overlap.ts";
export type { EvalContext } from "./context.ts";
export type { ResolvedCourse } from "./resolvedCourse.ts";
