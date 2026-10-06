import { courseKey } from "@sageplan/shared";
import type { Course } from "@sageplan/shared";

export type CourseIndex = {
  courses: Course[];
  byKey: Map<string, Course>;
  /** Precomputed once so searching never re-derives it per keystroke. */
  entries: IndexEntry[];
};

type IndexEntry = {
  course: Course;
  key: string;
  /** "CSCI051PO", for space-insensitive prefix matching. */
  squashedKey: string;
  department: string;
  number: number;
  titleLower: string;
  titleTokens: string[];
};

export function buildCourseIndex(courses: Course[]): CourseIndex {
  const entries = courses
    .map((course) => {
      const key = courseKey(course.id);
      return {
        course,
        key,
        squashedKey: key.replace(/\s+/g, "").toUpperCase(),
        department: course.id.department.toUpperCase(),
        number: course.id.courseNumber,
        titleLower: course.title.toLowerCase(),
        titleTokens: course.title.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
      };
    })
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  return {
    courses,
    byKey: new Map(entries.map((e) => [e.key, e.course])),
    entries,
  };
}

/**
 * A student typing "csci 5" wants CSCI 005, not the first course whose number
 * happens to begin with a five. Lower score is better; ties fall back to course
 * key so the list never reorders itself between keystrokes.
 */
const NO_MATCH = Number.POSITIVE_INFINITY;

export function search(index: CourseIndex, query: string, limit = 8): Course[] {
  const raw = query.trim();
  if (raw === "") return [];

  const upper = raw.toUpperCase();
  const squashedQuery = upper.replace(/\s+/g, "");
  const lower = raw.toLowerCase();
  const queryTokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
  const parsed = parseCodeQuery(upper);

  const scored: { entry: IndexEntry; score: number }[] = [];
  for (const entry of index.entries) {
    const score = scoreEntry(entry, squashedQuery, lower, queryTokens, parsed);
    if (score !== NO_MATCH) scored.push({ entry, score });
  }

  scored.sort((a, b) => (a.score !== b.score ? a.score - b.score : a.entry.key < b.entry.key ? -1 : 1));
  return scored.slice(0, limit).map((s) => s.entry.course);
}

/** "CSCI 5" -> { department: "CSCI", numberText: "5" } */
function parseCodeQuery(upper: string): { department: string; numberText: string } | null {
  const m = /^([A-Z]{2,5})\s*([0-9]{0,3})[A-Z0-9]*$/.exec(upper.trim());
  if (!m?.[1]) return null;
  return { department: m[1], numberText: m[2] ?? "" };
}

function scoreEntry(
  entry: IndexEntry,
  squashedQuery: string,
  lower: string,
  queryTokens: string[],
  parsed: { department: string; numberText: string } | null,
): number {
  if (entry.squashedKey.startsWith(squashedQuery)) return 0;

  if (parsed && entry.department.startsWith(parsed.department)) {
    if (parsed.numberText === "") return 3;
    const n = Number(parsed.numberText);
    if (Number.isFinite(n) && entry.number === n) return 1;
    if (String(entry.number).startsWith(parsed.numberText)) return 2;
    if (String(entry.number).padStart(3, "0").startsWith(parsed.numberText)) return 2;
  }

  // Every query token has to find a title word starting with it, so "intro comp"
  // means both words rather than either.
  if (queryTokens.length > 0 && queryTokens.every((t) => entry.titleTokens.some((w) => w.startsWith(t)))) {
    return 4;
  }
  if (entry.titleLower.includes(lower)) return 5;

  return NO_MATCH;
}
