import type { CompletedCourse, Course, GeAttribute } from "@gradguide/shared";
import { courseKey, gradePoints, isPassing } from "@gradguide/shared";

/**
 * A completed course joined to its catalog entry.
 *
 * The student's own fields win over the catalog: a transfer or study-abroad
 * course is not in the catalog at all, and a transfer student's pre-matriculation
 * Breadth award is recorded on the plan rather than in Coursedog.
 */
export type ResolvedCourse = {
  completed: CompletedCourse;
  key: string;
  credits: number;
  attributes: GeAttribute[];
  inCatalog: boolean;
  /** isPassing(grade): any letter above F, or CR/P. In-progress grades are not passing. */
  passing: boolean;
  /** GPA points, or null for CR/P/NC/NP/IP. */
  letterPoints: number | null;
};

export function resolveCompleted(completed: CompletedCourse, fromCatalog: Course | undefined): ResolvedCourse {
  return {
    completed,
    key: courseKey(completed.course),
    credits: completed.credits ?? fromCatalog?.credits.min ?? 1,
    attributes: completed.attributes ?? fromCatalog?.attributes ?? [],
    inCatalog: fromCatalog !== undefined,
    passing: isPassing(completed.grade),
    letterPoints: gradePoints(completed.grade),
  };
}
