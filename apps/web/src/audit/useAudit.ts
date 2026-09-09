import { useMemo } from "react";
import { evaluate } from "@gradguide/engine";
import type { Course, Program, Result, StudentPlan } from "@gradguide/shared";

/**
 * Derived state, computed during render rather than in an effect: the engine is
 * pure and synchronous, and at this scale the whole audit is microseconds. An
 * effect here would render one frame of stale verdicts every time the student
 * types a course, which is the one thing this page must never do.
 */
export function useAudit(plan: StudentPlan, programs: Program[], catalog: Course[]): Result[] {
  return useMemo(() => evaluate(plan, programs, catalog), [plan, programs, catalog]);
}
