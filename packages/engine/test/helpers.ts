import type { CompletedCourse, CourseId, GeAttribute, Provenance, StudentPlan, TermId } from "@gradguide/shared";
import { emptyPlan, parseCourseKey } from "@gradguide/shared";
import type { ResolvedCourse } from "../src/resolvedCourse.ts";
import { resolveCompleted } from "../src/resolvedCourse.ts";

export function cid(key: string): CourseId {
  const id = parseCourseKey(key);
  if (!id) throw new Error(`bad course key in test: ${key}`);
  return id;
}

export function term(code: string): TermId {
  const m = /^(FA|SP)(\d{4})$/.exec(code);
  if (!m) throw new Error(`bad term code in test: ${code}`);
  return { term: m[1] as "FA" | "SP", year: Number(m[2]) };
}

/** A CompletedCourse with sensible defaults for tests. */
export function completed(
  key: string,
  opts: Partial<Omit<CompletedCourse, "course">> & { attributes?: GeAttribute[]; provenance?: Provenance } = {},
): CompletedCourse {
  return {
    course: cid(key),
    term: opts.term ?? term("FA2025"),
    grade: opts.grade ?? "A",
    gradeMode: opts.gradeMode ?? "letter",
    provenance: opts.provenance ?? "pomona",
    ...(opts.title !== undefined ? { title: opts.title } : {}),
    ...(opts.credits !== undefined ? { credits: opts.credits } : {}),
    ...(opts.attributes !== undefined ? { attributes: opts.attributes } : {}),
  };
}

/** Resolve a CompletedCourse with no catalog behind it (uses its own overrides). */
export function resolved(c: CompletedCourse): ResolvedCourse {
  return resolveCompleted(c, undefined);
}

export function planWith(over: Partial<StudentPlan> = {}): StudentPlan {
  return { ...emptyPlan("2026-2027", term("FA2025"), "firstYear"), ...over };
}
