import type { CourseId } from "@gradguide/shared";
import { courseKey, termCode } from "@gradguide/shared";
import type { ResolvedCourse } from "./resolvedCourse.ts";

/** Canonical ordering for every array the engine emits (docs/API.md 2.6). */
export function byCourseKey(a: CourseId, b: CourseId): number {
  const ka = courseKey(a);
  const kb = courseKey(b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

export function sortIds(ids: CourseId[]): CourseId[] {
  return [...ids].sort(byCourseKey);
}

/** Deterministic order for the student's own courses: key, then term. */
export function byResolved(a: ResolvedCourse, b: ResolvedCourse): number {
  if (a.key !== b.key) return a.key < b.key ? -1 : 1;
  const ta = termCode(a.completed.term);
  const tb = termCode(b.completed.term);
  return ta < tb ? -1 : ta > tb ? 1 : 0;
}

/** Credits are quarter-credits at worst; keep sums free of float dust. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
