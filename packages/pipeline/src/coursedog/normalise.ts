import { courseKey, type CatalogYear, type Course } from "@gradguide/shared";
import { mapAttributes } from "./attributeMap.ts";
import { courseIdFromRaw } from "./identity.ts";
import { KNOWN_AFFILIATIONS } from "./identity.ts";
import type { RawCoursedogCourse } from "./raw.ts";

/**
 * Course codes inside the structured requisite tree. The affiliation must be a
 * real campus code: a looser pattern also matches Coursedog's internal ids
 * (e.g. "DHQF80BF"), which would then be rendered to students as a prerequisite.
 */
const COURSE_CODE_RE = new RegExp(
  `"([A-Z]{2,5}\\s?\\d{1,3}[A-Z0-9]{0,2}\\s?(?:${KNOWN_AFFILIATIONS.join("|")}))"`,
  "g",
);

export interface NormaliseContext {
  catalogYear: CatalogYear;
  /** ISO instant the upstream fetch happened; becomes Course.lastVerified. */
  fetchedAt: string;
}

export type NormaliseReason =
  | "not-active"
  | "unparseable-id"
  | "empty-title"
  | "unmapped-attribute"
  | "invalid-credits";

export interface NormaliseIssue {
  reason: NormaliseReason;
  code: string;
  detail: string;
}

export function isIssue(v: Course | NormaliseIssue): v is NormaliseIssue {
  return (v as NormaliseIssue).reason !== undefined;
}

/**
 * Coursedog reports credits in two different shapes. Neither is invented here:
 * a missing value stays missing and the record becomes an issue rather than
 * silently defaulting to 1.
 */
function readCredits(raw: RawCoursedogCourse): { min: number; max: number; repeatable: boolean; maxRepeats: number } | null {
  const hours = raw.credits?.creditHours;
  if (!hours) return null;
  const min = hours.min ?? hours.value;
  const max = hours.max ?? hours.value ?? min;
  if (typeof min !== "number" || typeof max !== "number" || !Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (min < 0 || max < 0 || min > max) return null;
  const repeatable = raw.credits?.repeatable === true;
  const declared = raw.credits?.numberOfRepeats;
  const maxRepeats = repeatable && typeof declared === "number" && declared > 0 ? Math.floor(declared) : 0;
  return { min, max, repeatable, maxRepeats };
}

/**
 * Coursedog carries no requisite PROSE — only a structured `requisitesSimple`
 * tree. `Course.prereqText` is display-only, so we render the upstream's own
 * names and course codes verbatim rather than inventing sentences, and leave
 * `prereqRule` null (structured conversion is P2, docs/API.md section 1).
 */
function readPrereqText(raw: RawCoursedogCourse): string | null {
  const requisites = raw.requisites;
  if (!requisites || Object.keys(requisites).length === 0) return null;
  const simple = (requisites as { requisitesSimple?: unknown }).requisitesSimple;
  if (!Array.isArray(simple) || simple.length === 0) return null;

  const parts: string[] = [];
  for (const req of simple as Record<string, unknown>[]) {
    const name = typeof req.name === "string" ? req.name.trim() : "";
    const codes = new Set<string>();
    JSON.stringify(req.rules ?? "").replace(COURSE_CODE_RE, (_m, c: string) => {
      codes.add(c.trim());
      return _m;
    });
    const list = [...codes].join(", ");
    if (name && list) parts.push(`${name}: ${list}`);
    else if (name) parts.push(name);
    else if (list) parts.push(list);
  }
  return parts.length > 0 ? parts.join("; ") : null;
}

export function normaliseCourse(raw: RawCoursedogCourse, ctx: NormaliseContext): Course | NormaliseIssue {
  const code = String(raw.code ?? raw._id ?? "?");

  // Banked / Inactive records are administrative placeholders and test rows
  // ("PE WAIVER", "REG PENDING", "Your Course 101"), not courses.
  if (raw.status !== "Active") return { reason: "not-active", code, detail: `status=${String(raw.status)}` };

  const id = courseIdFromRaw(raw.subjectCode, raw.code, raw.courseNumber === undefined ? undefined : String(raw.courseNumber));
  if (!id) return { reason: "unparseable-id", code, detail: `subjectCode=${String(raw.subjectCode)} code=${code}` };

  const title = String(raw.name ?? "").trim();
  if (title.length === 0) return { reason: "empty-title", code, detail: "name is empty" };

  const { attrs, unmapped } = mapAttributes(raw.attributes ?? []);
  if (unmapped.length > 0) {
    return { reason: "unmapped-attribute", code, detail: unmapped.join(" | ") };
  }

  const credits = readCredits(raw);
  if (!credits) return { reason: "invalid-credits", code, detail: JSON.stringify(raw.credits?.creditHours ?? null) };

  return {
    id,
    title,
    description: String(raw.description ?? "").trim(),
    department: (raw.departments ?? [])[0] ?? id.department,
    credits,
    attributes: attrs,
    gradeMode: String(raw.gradeMode ?? ""),
    prereqText: readPrereqText(raw),
    prereqRule: null,
    catalogYear: ctx.catalogYear,
    sourceUrl: `https://catalog.pomona.edu/courses/${encodeURIComponent(courseKey(id))}`,
    lastVerified: ctx.fetchedAt,
  };
}

export function normaliseAll(
  records: readonly RawCoursedogCourse[],
  ctx: NormaliseContext,
): { courses: Course[]; issues: NormaliseIssue[] } {
  const courses: Course[] = [];
  const issues: NormaliseIssue[] = [];
  for (const raw of records) {
    const r = normaliseCourse(raw, ctx);
    if (isIssue(r)) issues.push(r);
    else courses.push(r);
  }
  return { courses, issues };
}
