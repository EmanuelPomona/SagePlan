/**
 * Pomona grade point scale, catalog "Grades, Credit and the Academic Record".
 * CR/NC, P/NP and transfer grades are never in the GPA.
 */
export const GRADE_POINTS: Readonly<Record<string, number>> = {
  "A": 4.0, "A-": 3.67,
  "B+": 3.33, "B": 3.0, "B-": 2.67,
  "C+": 2.33, "C": 2.0, "C-": 1.67,
  "D+": 1.33, "D": 1.0, "D-": 0.67,
  "F": 0,
};

/** Highest to lowest. Used for minGrade comparisons. */
export const LETTER_GRADE_ORDER = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"] as const;
export type LetterGrade = (typeof LETTER_GRADE_ORDER)[number];

export const PASSING_NON_LETTER_GRADES = ["CR", "P"] as const;
export const FAILING_NON_LETTER_GRADES = ["NC", "NP", "F"] as const;
export const IN_PROGRESS_GRADES = ["IP", "N"] as const;

export function isLetterGrade(g: string): g is LetterGrade {
  return (LETTER_GRADE_ORDER as readonly string[]).includes(g);
}

export function gradePoints(grade: string): number | null {
  return isLetterGrade(grade) ? GRADE_POINTS[grade]! : null;
}

/** A passing grade earns credit: any letter grade above F, or CR/P. */
export function isPassing(grade: string): boolean {
  if (grade === "F") return false;
  if (isLetterGrade(grade)) return true;
  return (PASSING_NON_LETTER_GRADES as readonly string[]).includes(grade);
}

/** true when `grade` is at least `min` on the letter scale. Non-letter grades never satisfy a minGrade. */
export function gradeAtLeast(grade: string, min: string): boolean {
  if (!isLetterGrade(grade) || !isLetterGrade(min)) return false;
  return LETTER_GRADE_ORDER.indexOf(grade) <= LETTER_GRADE_ORDER.indexOf(min);
}
