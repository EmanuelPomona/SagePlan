import { courseKey, type Course, type GeAttribute } from "@gradguide/shared";

export interface DiscardedCourse {
  key: string;
  title: string;
  keptAttributes: GeAttribute[];
  discardedAttributes: GeAttribute[];
  reason: string;
}

/**
 * Coursedog returns several catalog EDITIONS of the same course. On 2026-09-08
 * 139 Active groups duplicated on courseKey; 56 disagreed on GE attributes, and
 * in 55 of those the newest edition was the one with `attributes: []`.
 *
 * So "newest wins" is actively wrong here: it would strip Area/WI/SI tags from
 * 55 courses and make the engine answer `unmet` for requirements a student has
 * satisfied. We keep the MOST COMPLETE record instead:
 *
 *   1. more GE attributes wins
 *   2. then a non-empty / longer description
 *   3. then a longer title, as a stable last resort
 *
 * Raised with the manager as CONTRACT CHANGE REQUEST item 2
 * (docs/handoffs/agent-backend.md); this is the proposed rule, implemented so
 * work continues. Discards are reported, never silent.
 */
function isMoreComplete(candidate: Course, incumbent: Course): boolean {
  if (candidate.attributes.length !== incumbent.attributes.length) {
    return candidate.attributes.length > incumbent.attributes.length;
  }
  if (candidate.description.length !== incumbent.description.length) {
    return candidate.description.length > incumbent.description.length;
  }
  if (candidate.prereqText !== incumbent.prereqText) {
    return (candidate.prereqText ?? "").length > (incumbent.prereqText ?? "").length;
  }
  return candidate.title.length > incumbent.title.length;
}

export function dedupeCourses(courses: readonly Course[]): { courses: Course[]; discarded: DiscardedCourse[] } {
  const winners = new Map<string, Course>();
  const order: string[] = [];

  for (const course of courses) {
    const key = courseKey(course.id);
    const incumbent = winners.get(key);
    if (incumbent === undefined) {
      winners.set(key, course);
      order.push(key);
      continue;
    }
    if (isMoreComplete(course, incumbent)) winners.set(key, course);
  }

  const discarded: DiscardedCourse[] = [];
  for (const course of courses) {
    const key = courseKey(course.id);
    const kept = winners.get(key)!;
    if (kept === course) continue;
    discarded.push({
      key,
      title: course.title,
      keptAttributes: kept.attributes,
      discardedAttributes: course.attributes,
      reason:
        kept.attributes.length !== course.attributes.length
          ? "kept the edition carrying more GE attributes"
          : "kept the edition with more catalog detail",
    });
  }

  return { courses: order.map((k) => winners.get(k)!), discarded };
}
