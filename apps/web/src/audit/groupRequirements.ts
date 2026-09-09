import type { Program, Requirement, RequirementStatus, Result, StudentPlan } from "@gradguide/shared";

export type AuditRow = { requirement: Requirement; result: Result };
export type Group = { title: string; rows: AuditRow[]; /** Set when "n of m" is a real count. */ countable: boolean };

/**
 * Which group each requirement belongs to, expressed as DATA rather than as a
 * code path. General education is Program #1, not a special case
 * (docs/ARCHITECTURE.md rule 1): a program whose ids are not in this table
 * still groups, by rule kind, and nothing is dropped.
 */
const GROUP_BY_REQUIREMENT: Record<string, string> = {
  "critical-inquiry": "Foundations",
  "area-1": "Breadth", "area-2": "Breadth", "area-3": "Breadth",
  "area-4": "Breadth", "area-5": "Breadth", "area-6": "Breadth",
  "writing-intensive": "Overlays", "speaking-intensive": "Overlays", "analyzing-difference": "Overlays",
  language: "Language",
  "physical-education": "Physical education", "physical-education-transfer": "Physical education",
  "total-credits": "Credits", "post-matriculation-credits": "Credits",
  "post-matriculation-credits-transfer": "Credits", "pomona-residency-credits": "Credits",
  gpa: "Grade point average",
};

/**
 * Reading order: what you must take, then what must be covered, then the
 * totals, then the average. The fallback groups sit in it too, so a major
 * reads the same way as general education.
 */
const GROUP_ORDER = [
  "Foundations", "Required courses", "Breadth", "Overlays", "Language",
  "Physical education", "Other requirements", "Credits", "Grade point average",
];

/** Where an unrecognised requirement goes, so a major renders through this path too. */
const FALLBACK_GROUP: Record<Requirement["rule"]["kind"], string> = {
  course: "Required courses",
  attribute: "Required courses",
  credits: "Credits",
  gpa: "Grade point average",
  attested: "Other requirements",
  allOf: "Other requirements", anyOf: "Other requirements", chooseN: "Other requirements",
  fromSet: "Other requirements", milestone: "Other requirements", not: "Other requirements",
};

/** What is still owed comes first. A finished row is reference, not news. */
const STATUS_ORDER: Record<RequirementStatus, number> = {
  unmet: 0, partial: 1, unverifiable: 2, satisfied: 3,
};

export function groupRequirements(program: Program, results: Result[], plan: StudentPlan): Group[] {
  const byId = new Map(program.requirements.map((r) => [r.id, r]));
  const ordered = new Map<string, AuditRow[]>();

  for (const result of results) {
    if (result.programId !== program.id) continue;
    const requirement = byId.get(result.requirementId);
    if (!requirement) continue;
    if (isHidden(requirement, result, plan)) continue;

    const title = GROUP_BY_REQUIREMENT[requirement.id] ?? FALLBACK_GROUP[requirement.rule.kind];
    ordered.set(title, [...(ordered.get(title) ?? []), { requirement, result }]);
  }

  const titles = [...ordered.keys()].sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a);
    const ib = GROUP_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a < b ? -1 : 1;
  });

  return titles.map((title) => {
    const rows = [...(ordered.get(title) ?? [])].sort(compareRows);
    return { title, rows, countable: rows.length > 1 && rows.every((r) => !r.result.waived) };
  });
}

/**
 * A requirement that does not apply to this student is noise, with one
 * exception: being excused from Critical Inquiry is something a transfer
 * student needs to be told, not something to hide. The exception is expressed
 * as "waived and alone in its group" rather than by naming the requirement, so
 * it does not become another general-education special case.
 */
function isHidden(requirement: Requirement, result: Result, plan: StudentPlan): boolean {
  const applies = requirement.appliesWhen?.studentType;
  if (!applies || applies.includes(plan.studentType)) return false;

  const group = GROUP_BY_REQUIREMENT[requirement.id] ?? FALLBACK_GROUP[requirement.rule.kind];
  const isSoleMemberOfGroup = Object.entries(GROUP_BY_REQUIREMENT).filter(([, g]) => g === group).length === 1;
  return !(result.waived === true && isSoleMemberOfGroup);
}

function compareRows(a: AuditRow, b: AuditRow): number {
  const aw = a.result.waived === true ? 1 : 0;
  const bw = b.result.waived === true ? 1 : 0;
  if (aw !== bw) return aw - bw;

  const as = STATUS_ORDER[a.result.status];
  const bs = STATUS_ORDER[b.result.status];
  if (as !== bs) return as - bs;

  return a.requirement.id < b.requirement.id ? -1 : a.requirement.id > b.requirement.id ? 1 : 0;
}
