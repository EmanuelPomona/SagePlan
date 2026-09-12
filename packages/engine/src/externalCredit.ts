import type {
  CourseId,
  CreditCaps,
  ExamMatch,
  ExamSubject,
  ExternalCredit,
  ExternalCreditInput,
  ExternalCreditRules,
  GeAttribute,
} from "@gradguide/shared";
import { courseKey, sameCourse } from "@gradguide/shared";
import type { EvalContext } from "./context.ts";
import { round2 } from "./ordering.ts";
import type { ResolvedCourse } from "./resolvedCourse.ts";

/**
 * Every attribute granted by an exam is reported against this single pseudo-id,
 * so the UI can render "satisfied by AP Spanish Language (5)" without inventing
 * a fake course. docs/API.md 2.4.
 */
export const EXAM_PSEUDO_ID: CourseId = {
  department: "EXAM",
  courseNumber: 0,
  suffix: "",
  affiliation: "EXT",
};

export const EXAM_PSEUDO_KEY = courseKey(EXAM_PSEUDO_ID);

export function isExamPseudo(course: ResolvedCourse): boolean {
  return sameCourse(course.completed.course, EXAM_PSEUDO_ID);
}

/**
 * Qualifying exams, expressed as pseudo courses so the assignment step treats a
 * granted attribute exactly like a completed course carrying it.
 *
 * provenance is `transfer`: that is what keeps exam credit out of the Breadth
 * areas, whose filters admit only pomona and claremont work.
 */
export function examGrantCourses(ctx: EvalContext): ResolvedCourse[] {
  const out: ResolvedCourse[] = [];
  for (const ec of ctx.externalCredits) {
    if (!ec.qualifies || ec.grantsAttributes.length === 0) continue;
    out.push(examGrantCourse(ec, ctx));
  }
  return out;
}

function examGrantCourse(ec: ExternalCredit, ctx: EvalContext): ResolvedCourse {
  return {
    completed: {
      course: EXAM_PSEUDO_ID,
      term: ctx.matriculationTerm,
      grade: "CR",
      gradeMode: "creditNoCredit",
      provenance: "transfer",
      title: ec.label,
      credits: ec.credits,
      attributes: ec.grantsAttributes,
    },
    // Every exam REPORTS as EXAM 000 EXT, but two exams are not the same course:
    // a shared key would let one grant block another during assignment.
    key: `${EXAM_PSEUDO_KEY}#${ec.subjectKey}`,
    credits: ec.credits,
    attributes: ec.grantsAttributes,
    inCatalog: false,
    passing: true,
    letterPoints: null,
    // An exam has no term, but its term is not UNKNOWN: it is not a course the
    // student sat, so it never participates in a term-dependent rule.
    termUnknown: false,
    // Exams already get distinct internal keys per subject, so they never need
    // the repeat allowance -- and one exam must never count twice.
    repeatable: false,
  };
}

/**
 * Advanced-standing credit actually countable from a set of exams.
 *
 * docs/API.md 2.4, in order: one credit per duplicateKey (the largest), then
 * caps.advancedStandingCredits. The caps.externalCredits ceiling is applied
 * later, by the credits rule, because it is shared with transfer coursework.
 */
export function countExternalCredits(
  credits: ExternalCredit[],
  caps: CreditCaps,
): { advancedStanding: number; notes: string[] } {
  const notes: string[] = [];

  const largestPerDuplicate = new Map<string, number>();
  let duplicatesDropped = 0;
  for (const ec of [...credits].sort((a, b) => (a.subjectKey < b.subjectKey ? -1 : a.subjectKey > b.subjectKey ? 1 : 0))) {
    if (!ec.qualifies || ec.credits <= 0) continue;
    const seen = largestPerDuplicate.get(ec.duplicateKey);
    if (seen === undefined) {
      largestPerDuplicate.set(ec.duplicateKey, ec.credits);
    } else {
      duplicatesDropped += 1;
      if (ec.credits > seen) largestPerDuplicate.set(ec.duplicateKey, ec.credits);
    }
  }
  if (duplicatesDropped > 0) {
    notes.push(`${duplicatesDropped} duplicate exam${duplicatesDropped === 1 ? "" : "s"} earned credit only once.`);
  }

  const raw = round2([...largestPerDuplicate.values()].reduce((sum, c) => sum + c, 0));
  const cap = caps.advancedStandingCredits;
  if (cap !== undefined && raw > cap) {
    notes.push(`Advanced standing credit is capped at ${cap}.`);
    return { advancedStanding: cap, notes };
  }
  return { advancedStanding: raw, notes };
}

/**
 * Turn what the student entered into what the catalog awards (docs/API.md 2.4).
 *
 * Never throws: an unknown exam, a missing score and a rule that does not fire
 * are all reported through `qualifies` and `notes`.
 */
export function resolveExternalCredit(
  input: ExternalCreditInput,
  rules: ExternalCreditRules,
): ExternalCredit {
  const subject = rules.subjects.find((s) => s.key === input.subjectKey);
  if (!subject) {
    return {
      ...input,
      label: input.subjectKey,
      credits: 0,
      grantsAttributes: [],
      qualifies: false,
      duplicateKey: input.subjectKey,
      ruleIds: [],
      notes: ["unknown exam"],
    };
  }

  let credits = 0;
  const grantsAttributes: GeAttribute[] = [];
  const ruleIds: string[] = [];
  const notes: string[] = [];

  for (const rule of rules.rules) {
    if (ruleMatches(rule.match, subject, input)) {
      ruleIds.push(rule.id);
      if (rule.effect === "credit") {
        credits = Math.max(credits, subject.duration === "year" ? 1 : 0.5);
      } else {
        for (const attr of rule.grantsAttributes ?? []) {
          if (!grantsAttributes.includes(attr)) grantsAttributes.push(attr);
        }
      }
      continue;
    }
    // Only explain rules that were actually about this kind of exam.
    if (rule.match.kind === subject.kind) {
      const why = whyNot(rule.match, rule.effect, subject, input);
      if (why && !notes.includes(why)) notes.push(why);
    }
  }

  return {
    ...input,
    label: subject.label,
    credits,
    grantsAttributes,
    qualifies: credits > 0 || grantsAttributes.length > 0,
    duplicateKey: subject.duplicateKey,
    ruleIds,
    notes,
  };
}

function ruleMatches(m: ExamMatch, subject: ExamSubject, input: ExternalCreditInput): boolean {
  if (m.kind !== undefined && m.kind !== subject.kind) return false;
  if (m.category !== undefined && m.category !== subject.category) return false;
  if (m.ibGroup !== undefined && m.ibGroup !== subject.ibGroup) return false;
  if (m.levels !== undefined && (input.level === null || !m.levels.includes(input.level))) return false;
  if (m.minScore !== undefined && (input.score === null || input.score < m.minScore)) return false;
  if (m.minGrade !== undefined && !gradeMeets(input.grade, m.minGrade, m.gradeScale)) return false;
  if (m.excludeRomanizedScript === true && subject.romanizedScript === true) return false;
  if (m.subjectKeys !== undefined && !m.subjectKeys.includes(subject.key)) return false;
  if (m.excludeSubjectKeys !== undefined && m.excludeSubjectKeys.includes(subject.key)) return false;
  return true;
}

/** Highest-first scale, e.g. ["A*","A","B","C","D","E"]. */
function gradeMeets(grade: string | null, minGrade: string, scale: string[] | undefined): boolean {
  if (grade === null || !scale) return false;
  const got = scale.indexOf(grade);
  const need = scale.indexOf(minGrade);
  return got !== -1 && need !== -1 && got <= need;
}

/** The one sentence that explains why a plausible rule did not fire. */
function whyNot(
  m: ExamMatch,
  effect: "credit" | "attribute",
  subject: ExamSubject,
  input: ExternalCreditInput,
): string | undefined {
  if (m.category !== undefined && m.category !== subject.category) return undefined;
  if (m.ibGroup !== undefined && m.ibGroup !== subject.ibGroup) return undefined;

  if (m.levels !== undefined && (input.level === null || !m.levels.includes(input.level))) {
    if (subject.kind === "IB" && input.level === "SL") {
      return effect === "credit"
        ? "IB Standard Level earns no advanced standing credit."
        : "This exam satisfies the language requirement only at Higher Level.";
    }
    return `This rule applies only at ${m.levels.join(" or ")}.`;
  }
  if (m.excludeRomanizedScript === true && subject.romanizedScript === true) {
    return "SAT-II exams tested in Romanized script do not satisfy the language requirement.";
  }
  if (m.excludeSubjectKeys !== undefined && m.excludeSubjectKeys.includes(subject.key)) {
    return "This subject is excluded from the A-Level language provision.";
  }
  if (m.minScore !== undefined && (input.score === null || input.score < m.minScore)) {
    return `A score of ${m.minScore} or higher is required.`;
  }
  if (m.minGrade !== undefined && !gradeMeets(input.grade, m.minGrade, m.gradeScale)) {
    return `A grade of ${m.minGrade} or higher is required.`;
  }
  return undefined;
}
