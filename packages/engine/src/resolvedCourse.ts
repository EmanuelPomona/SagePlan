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
  /**
   * Any letter above F, or CR/P, or NO RECORDED GRADE. A null grade means the
   * student passed (ADR-015): the app never asks for grades, so a course they
   * failed is the one that must carry one.
   */
  passing: boolean;
  /** GPA points, or null for CR/P/NC/NP/IP and for an unrecorded grade. */
  letterPoints: number | null;
  /** True when the student has not recorded when this course was taken. */
  termUnknown: boolean;
  /**
   * True when the catalog marks this course repeatable for credit. Two sittings
   * of a repeatable course are two courses; two sittings of anything else are
   * one course taken twice, and may not satisfy two requirements. A course the
   * catalog does not know is treated as not repeatable, which is the safe
   * direction: it can never inflate what the student is told they have.
   */
  repeatable: boolean;
};

export function resolveCompleted(completed: CompletedCourse, fromCatalog: Course | undefined): ResolvedCourse {
  const grade = completed.grade;
  return {
    completed,
    key: courseKey(completed.course),
    credits: completed.credits ?? fromCatalog?.credits.min ?? 1,
    attributes: completed.attributes ?? fromCatalog?.attributes ?? [],
    inCatalog: fromCatalog !== undefined,
    passing: grade === null ? true : isPassing(grade),
    letterPoints: grade === null ? null : gradePoints(grade),
    termUnknown: completed.term === null,
    repeatable: fromCatalog?.credits.repeatable ?? false,
  };
}
