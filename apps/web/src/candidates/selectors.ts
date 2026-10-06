import { compareTerms, courseKey, sameCourse, sameTerm } from "@sageplan/shared";
import type { CourseId, OfferingHistory, Result, Section, TermId } from "@sageplan/shared";

/** Candidates that actually have a section in the chosen term, keyed by course key. */
export function offeredIn(candidates: CourseId[], sections: Section[]): Map<string, Section[]> {
  const wanted = new Set(candidates.map(courseKey));
  const out = new Map<string, Section[]>();
  for (const section of sections) {
    const key = courseKey(section.course);
    if (!wanted.has(key)) continue;
    out.set(key, [...(out.get(key) ?? []), section]);
  }
  return out;
}

/**
 * The other requirements this one course would also close.
 *
 * This is the question a student in registration week is actually asking, and
 * no official tool answers it: not "what satisfies Area 3" but "what satisfies
 * Area 3 AND something else I still owe".
 */
export function dualPurpose(course: CourseId, results: Result[], currentRequirementId: string): string[] {
  return results
    .filter((r) => r.requirementId !== currentRequirementId)
    .filter((r) => r.status === "unmet" || r.status === "partial")
    .filter((r) => r.candidates.some((c) => sameCourse(c, course)))
    .map((r) => r.requirementId);
}

export type RibbonCell = { term: TermId; offered: boolean };

/**
 * The last n terms, with a mark for every term this course actually ran.
 *
 * "Has this run recently?" is a glance rather than a search, and no official
 * tool draws it. A course absent from the history is all hollow, which is the
 * honest answer rather than an empty space.
 */
export function ribbon(
  course: CourseId,
  history: OfferingHistory[],
  knownTerms: TermId[],
  n = 8,
): RibbonCell[] {
  const recent = [...knownTerms].sort(compareTerms).slice(-n);
  const entry = history.find((h) => sameCourse(h.course, course));
  const ran = entry?.terms ?? [];
  return recent.map((term) => ({ term, offered: ran.some((t) => sameTerm(t, term)) }));
}
