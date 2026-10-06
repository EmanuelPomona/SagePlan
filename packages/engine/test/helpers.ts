import type {
  CompletedCourse,
  Course,
  CourseId,
  ExternalCredit,
  GeAttribute,
  Program,
  Provenance,
  Requirement,
  StudentPlan,
  TermId,
} from "@sageplan/shared";
import { emptyPlan, parseCourseKey } from "@sageplan/shared";
import type { ResolvedCourse } from "../src/resolvedCourse.ts";
import { resolveCompleted } from "../src/resolvedCourse.ts";

export function cid(key: string): CourseId {
  const id = parseCourseKey(key);
  if (!id) throw new Error(`bad course key in test: ${key}`);
  return id;
}

export function term(code: string): TermId {
  const m = /^(FA|SP)(\d{4})$/.exec(code);
  if (!m) throw new Error(`bad term code in test: ${code}`);
  return { term: m[1] as "FA" | "SP", year: Number(m[2]) };
}

/** A CompletedCourse with sensible defaults for tests. */
export function completed(
  key: string,
  opts: Partial<Omit<CompletedCourse, "course">> & { attributes?: GeAttribute[]; provenance?: Provenance } = {},
): CompletedCourse {
  return {
    course: cid(key),
    // `term`, `grade` and `gradeMode` are nullable now, so "not supplied" and
    // "explicitly null" must stay distinguishable in a fixture.
    term: "term" in opts ? (opts.term ?? null) : term("FA2025"),
    grade: "grade" in opts ? (opts.grade ?? null) : "A",
    gradeMode: "gradeMode" in opts ? (opts.gradeMode ?? null) : "letter",
    provenance: opts.provenance ?? "pomona",
    ...(opts.title !== undefined ? { title: opts.title } : {}),
    ...(opts.credits !== undefined ? { credits: opts.credits } : {}),
    ...(opts.attributes !== undefined ? { attributes: opts.attributes } : {}),
  };
}

/** Resolve a CompletedCourse with no catalog behind it (uses its own overrides). */
export function resolved(c: CompletedCourse): ResolvedCourse {
  return resolveCompleted(c, undefined);
}

export function planWith(over: Partial<StudentPlan> = {}): StudentPlan {
  return { ...emptyPlan("2026-2027", term("FA2025"), "firstYear"), ...over };
}

/** A minimal catalog Course for unit tests. */
export function catalogCourse(
  key: string,
  attributes: GeAttribute[] = [],
  credits = 1,
  title = "Test Course",
): Course {
  const id = cid(key);
  return {
    id,
    title,
    description: "",
    department: id.department,
    credits: { min: credits, max: credits, repeatable: false, maxRepeats: 0 },
    attributes,
    gradeMode: "Letter",
    prereqText: null,
    prereqRule: null,
    catalogYear: "2026-2027",
    sourceUrl: "https://catalog.pomona.edu/courses/test",
    lastVerified: "2026-09-08T00:00:00Z",
  };
}

/** A qualifying ExternalCredit granting the given attributes. */
export function grant(
  subjectKey: string,
  label: string,
  grantsAttributes: GeAttribute[],
  credits = 0,
  duplicateKey = subjectKey,
): ExternalCredit {
  return {
    kind: "AP",
    subjectKey,
    score: 5,
    grade: null,
    level: null,
    label,
    credits,
    grantsAttributes,
    qualifies: credits > 0 || grantsAttributes.length > 0,
    duplicateKey,
    ruleIds: ["test-rule"],
    notes: [],
  };
}

/** A minimal Requirement for assignment tests. */
export function requirement(
  id: string,
  rule: Requirement["rule"],
  overlapPolicy: Requirement["overlapPolicy"] = { kind: "allowAll" },
  over: Partial<Requirement> = {},
): Requirement {
  return {
    id,
    label: id,
    explanation: "test requirement",
    sourceQuote: "test quote",
    sourceRef: { slug: "test", url: "https://catalog.pomona.edu/test" },
    rule,
    overlapPolicy,
    ...over,
  };
}

export function attributeRule(attr: GeAttribute, n = 1, over: Record<string, unknown> = {}) {
  return { kind: "attribute", attr, n, ...over } as Requirement["rule"];
}

/** A minimal Program wrapping the given requirements. */
export function program(id: string, requirements: Requirement[], constraints?: Program["constraints"]): Program {
  return {
    id,
    name: id,
    kind: "general-education",
    catalogYear: "2026-2027",
    requirements,
    ...(constraints ? { constraints } : {}),
    confidence: "verified",
    sourceUrl: "https://catalog.pomona.edu/test",
    encodedBy: "test",
    encodedOn: "2026-09-08",
    notes: "",
  };
}
