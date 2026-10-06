import {
  compareTerms, courseKey, type CatalogYear, type Course, type Meeting,
  type OfferingHistory, type Section, type TermId,
} from "@sageplan/shared";
import { mapGeCodes } from "./geCodes.ts";
import { RawSectionSchema, RawHistorySchema } from "./raw.ts";

export interface SectionIssue { reason: "unsupported-term" | "term-mismatch" | "bad-shape"; detail: string }
export function isSectionIssue(v: Section | SectionIssue): v is SectionIssue {
  return (v as SectionIssue).reason !== undefined;
}

const isSupportedTerm = (t: string): t is "FA" | "SP" => t === "FA" || t === "SP";

/**
 * Hyperschedule decomposes course identity exactly like `CourseId`, so the
 * fields are MAPPED, never re-parsed from a rendered string (brief section 7B).
 */
function toCourseId(code: { department: string; courseNumber: number; suffix?: string; affiliation: string }) {
  return {
    department: String(code.department).toUpperCase(),
    courseNumber: code.courseNumber,
    suffix: String(code.suffix ?? "").toUpperCase(),
    affiliation: String(code.affiliation).toUpperCase(),
  };
}

function toMeetings(schedules: { startTime?: number; endTime?: number; days?: string[]; locations?: string[] }[]): Meeting[] {
  const out: Meeting[] = [];
  for (const s of schedules ?? []) {
    const startSec = s.startTime ?? 0;
    const endSec = s.endTime ?? startSec;
    out.push({
      days: s.days ?? [],
      startSec,
      endSec,
      // Section.meeting.location is a single string; Hyperschedule can list several rooms.
      location: (s.locations ?? []).join(", "),
    });
  }
  return out;
}

export function normaliseSection(raw: unknown, term: TermId): Section | SectionIssue {
  const parsed = RawSectionSchema.safeParse(raw);
  if (!parsed.success) return { reason: "bad-shape", detail: parsed.error.issues[0]?.message ?? "unparseable" };
  const r = parsed.data;
  const id = r.identifier;

  const season = String(id.term).toUpperCase();
  if (!isSupportedTerm(season)) {
    return { reason: "unsupported-term", detail: `${String(id.term)}${id.year}` };
  }
  // Cross-check against the term we asked for: a section filed under a
  // different term would silently make "is this offered in SP2027" wrong.
  if (id.year !== term.year || season !== term.term) {
    return { reason: "term-mismatch", detail: `section is ${season}${id.year}, expected ${term.term}${term.year}` };
  }

  const half = id.half == null ? null : `${id.half.prefix}${id.half.number ?? ""}`;

  return {
    course: toCourseId(id),
    sectionNumber: id.sectionNumber ?? 0,
    term: { year: id.year, term: season },
    half,
    instructors: (r.instructors ?? []).map((i) => String(i.name ?? "")).filter((n) => n.length > 0),
    meetings: toMeetings(r.schedules ?? []),
    seatsTotal: Math.max(0, Math.trunc(r.seatsTotal ?? 0)),
    seatsFilled: Math.max(0, Math.trunc(r.seatsFilled ?? 0)),
    permCount: Math.max(0, Math.trunc(r.permCount ?? 0)),
    status: String(r.status ?? ""),
    geCodes: r.courseAreas ?? [],
  };
}

/**
 * Build a Course for a non-Pomona section so the catalog can hold every 5C
 * course a Pomona student may count (a Scripps course tagged 1A2 satisfies
 * Area 2). Descriptions are empty by design: Hyperschedule is a schedule, and
 * the credit value is copied honestly rather than defaulted to 1.
 */
export function courseFromSection(raw: unknown, ctx: { catalogYear: CatalogYear; fetchedAt: string }): Course | null {
  const parsed = RawSectionSchema.safeParse(raw);
  if (!parsed.success) return null;
  const r = parsed.data;
  const id = toCourseId(r.identifier);
  const title = String(r.course?.title ?? "").trim();
  if (title.length === 0) return null;

  // A section that genuinely carries 0 credits is real data and kept as 0. A
  // section with NO credit value is not the same thing: defaulting it to 0 both
  // invents a fact and trips the partial-credit exclusion validator for a course
  // that may well be worth one. Refuse it instead; the caller counts the refusal.
  if (typeof r.credits !== "number" || !Number.isFinite(r.credits) || r.credits < 0) return null;
  const credits = r.credits;
  const { attrs } = mapGeCodes(r.courseAreas ?? []);

  return {
    id,
    title,
    description: "",
    department: id.department,
    credits: { min: credits, max: credits, repeatable: false, maxRepeats: 0 },
    attributes: attrs,
    gradeMode: "",
    prereqText: null,
    prereqRule: null,
    catalogYear: ctx.catalogYear,
    sourceUrl: `https://hyperschedule.io/?course=${encodeURIComponent(courseKey(id))}`,
    lastVerified: ctx.fetchedAt,
  };
}

export function normaliseHistory(records: readonly unknown[]): OfferingHistory[] {
  const byKey = new Map<string, OfferingHistory>();
  for (const raw of records) {
    const parsed = RawHistorySchema.safeParse(raw);
    if (!parsed.success) continue;
    const course = toCourseId(parsed.data.code);
    const terms: TermId[] = [];
    for (const t of parsed.data.terms) {
      const season = String(t.term).toUpperCase();
      if (!isSupportedTerm(season)) continue;
      if (!terms.some((x) => x.year === t.year && x.term === season)) terms.push({ year: t.year, term: season });
    }
    terms.sort(compareTerms);
    const key = courseKey(course);
    const existing = byKey.get(key);
    if (existing === undefined) byKey.set(key, { course, terms });
    else {
      for (const t of terms) if (!existing.terms.some((x) => x.year === t.year && x.term === t.term)) existing.terms.push(t);
      existing.terms.sort(compareTerms);
    }
  }
  return [...byKey.values()];
}
