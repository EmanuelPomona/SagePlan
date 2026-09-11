import { courseKey, type Course } from "@gradguide/shared";

/**
 * Catalog membership (ADR-016, acceptance criterion AC-B00).
 *
 * The `status: "Active"` filter only ever applied to Coursedog, so placeholder
 * records reached `data/catalog.json` through the Hyperschedule merge and were
 * reachable from the course autocomplete — reviewer M-5. Hyperschedule publishes
 * no status field, so membership is decided from the record itself.
 *
 * Three outcomes, deliberately distinct:
 *   exclude    — matches a rule ADR-016 names explicitly. Dropped, and listed in
 *                data/reports/catalog-excluded.md.
 *   suspicious — looks like a placeholder but matches no named rule. KEPT and
 *                reported: the ruling says "anything else suspicious is reported,
 *                not silently dropped", and inventing new drop rules would exceed it.
 *   keep       — an ordinary course.
 */
export type Verdict = "keep" | "exclude" | "suspicious";

export interface Classification {
  verdict: Verdict;
  reason: string;
}

/** Titles that are unmistakably scheduling scaffolding rather than a course. */
const DNR_PREFIX = /^\s*dnr:/i;

/**
 * Phrases that mark a placeholder when they describe the WHOLE title. Anchored
 * so a real course survives: "Psychological Testing and Assessment" and
 * "Test Theory" are legitimate, "Test Course-Disregard" is not.
 */
const SUSPICIOUS_TITLE = [
  /\btest\s+course\b/i,
  /\bdisregard\b/i,
  /\bdo\s+not\s+use\b/i,
  /\bplaceholder\b/i,
  /\bdummy\b/i,
];

export function classifyCourse(course: Course): Classification {
  const title = String(course.title ?? "");

  if (course.id.department === "TEST") {
    return { verdict: "exclude", reason: "department TEST is a scheduling placeholder (ADR-016)" };
  }
  if (DNR_PREFIX.test(title)) {
    return { verdict: "exclude", reason: 'title begins "DNR:" — a registrar scheduling note, not a course (ADR-016)' };
  }
  for (const pattern of SUSPICIOUS_TITLE) {
    if (pattern.test(title)) {
      return {
        verdict: "suspicious",
        reason: `title matches ${pattern} but the record matches no named exclusion rule; kept and reported per ADR-016`,
      };
    }
  }
  return { verdict: "keep", reason: "" };
}

export interface ExcludedCourse {
  key: string;
  title: string;
  affiliation: string;
  reason: string;
}

export interface MembershipResult {
  kept: Course[];
  excluded: ExcludedCourse[];
  suspicious: ExcludedCourse[];
}

/**
 * Apply catalog membership to a course list. Called by BOTH writers of
 * data/catalog.json (the Coursedog refresh and the Hyperschedule merge), so the
 * rule cannot be enforced on one source and forgotten on the other — which is
 * exactly how M-5 happened.
 */
export function applyMembership(courses: readonly Course[]): MembershipResult {
  const kept: Course[] = [];
  const excluded: ExcludedCourse[] = [];
  const suspicious: ExcludedCourse[] = [];

  for (const course of courses) {
    const { verdict, reason } = classifyCourse(course);
    const row: ExcludedCourse = {
      key: courseKey(course.id),
      title: course.title,
      affiliation: course.id.affiliation,
      reason,
    };
    if (verdict === "exclude") { excluded.push(row); continue; }
    if (verdict === "suspicious") suspicious.push(row);
    kept.push(course);
  }
  return { kept, excluded, suspicious };
}

/** The report AC-B00 requires. */
export function membershipReport(
  result: MembershipResult,
  totalConsidered: number,
  pruned: readonly ExcludedCourse[] = [],
): string {
  return [
    "# Records excluded from the catalog",
    "",
    `${totalConsidered} candidate course(s) considered; **${result.excluded.length}** excluded, `
      + `**${pruned.length}** pruned as no longer offered, `
      + `**${result.suspicious.length}** kept but flagged, ${result.kept.length} in the catalog.`,
    "",
    "## Why this file exists",
    "",
    "The `status: \"Active\"` filter only ever applied to Coursedog, so scheduling",
    "placeholders reached the catalog through the Hyperschedule merge and turned up",
    "in the course autocomplete (reviewer M-5). ADR-016 names two exclusion rules —",
    "`department` `TEST`, and a title beginning `DNR:` — and requires anything else",
    "suspicious to be reported rather than silently dropped.",
    "",
    "## Excluded",
    "",
    ...(result.excluded.length === 0
      ? ["_None._", ""]
      : ["| Course | Affiliation | Title | Rule |", "|---|---|---|---|",
         ...result.excluded.map((r) => `| ${r.key} | ${r.affiliation} | ${r.title} | ${r.reason} |`), ""]),
    "## Pruned: no section in any ingested term",
    "",
    "ADR-016: a non-Pomona course enters the catalog only via a section in an",
    "ingested term. These were in the previous catalog but are not offered in any",
    "term currently on disk, so they are no longer reachable from the app. Pomona",
    "courses are never pruned — they come from Coursedog, not from the schedule.",
    "",
    ...(pruned.length === 0
      ? ["_None._", ""]
      : ["| Course | Affiliation | Title |", "|---|---|---|",
         ...pruned.map((r) => `| ${r.key} | ${r.affiliation} | ${r.title} |`), ""]),
    "## Kept, but flagged for a human",
    "",
    "These match no named exclusion rule, so they remain in the catalog. If any is",
    "genuinely a placeholder, the fix is a new rule in ADR-016 — not a quiet drop here.",
    "",
    ...(result.suspicious.length === 0
      ? ["_None._", ""]
      : ["| Course | Affiliation | Title | Why flagged |", "|---|---|---|---|",
         ...result.suspicious.map((r) => `| ${r.key} | ${r.affiliation} | ${r.title} | ${r.reason} |`), ""]),
  ].join("\n");
}
