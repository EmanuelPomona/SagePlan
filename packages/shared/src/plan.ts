import { z } from "zod";
import { CatalogYearSchema, CourseIdSchema, GeAttributeSchema, TermIdSchema } from "./ids.ts";
import { ProvenanceSchema, StudentTypeSchema } from "./rule.ts";

/** The student's record. localStorage ONLY. Never sent anywhere. */

export const PLAN_SCHEMA_VERSION = 1 as const;

export const GradeModeSchema = z.enum(["letter", "creditNoCredit", "passNoPass"]).meta({ id: "GradeMode" });
export type GradeMode = z.infer<typeof GradeModeSchema>;

export const CompletedCourseSchema = z
  .object({
    course: CourseIdSchema,
    term: TermIdSchema.nullable().describe("When the course was taken, or null when the student has not recorded it. Entering terms is optional by design: a rule that needs a term is evaluated both with and without the unknown-term courses, and reports unverifiable only when the two disagree. See docs/API.md 2.7."),
    grade: z.string().nullable().describe('"A-", "CR", "P", "IP" (in progress), or null when not recorded. null is treated as PASSED, so a course the student did not pass must carry its grade. Letter grades feed a gpa rule; CR/P/NC/NP do not.'),
    gradeMode: GradeModeSchema.nullable().describe("null when not recorded."),
    provenance: ProvenanceSchema,
    title: z.string().optional().describe("Required when the course is not in the catalog (transfer or non-Pomona abroad)."),
    credits: z.number().min(0).optional().describe("Overrides the catalog credit value; required when the course is not in the catalog."),
    attributes: z.array(GeAttributeSchema).optional().describe("Overrides catalog attributes. Meaningful for transfer students' pre-matriculation Breadth/overlay awards."),
  })
  .meta({ id: "CompletedCourse" });
export type CompletedCourse = z.infer<typeof CompletedCourseSchema>;

export const PlannedCourseSchema = z.object({ course: CourseIdSchema, term: TermIdSchema }).meta({ id: "PlannedCourse", description: "Reserved for the P2 planner. Empty in P0." });
export type PlannedCourse = z.infer<typeof PlannedCourseSchema>;

export const ExamKindSchema = z.enum(["AP", "IB", "ALEVEL", "SATII"]).meta({ id: "ExamKind", description: "Transfer coursework is NOT an exam: enter it as CompletedCourse with provenance=transfer." });
export type ExamKind = z.infer<typeof ExamKindSchema>;

export const IbLevelSchema = z.enum(["HL", "SL"]).meta({ id: "IbLevel" });
export type IbLevel = z.infer<typeof IbLevelSchema>;

export const ExternalCreditInputSchema = z
  .object({
    kind: ExamKindSchema,
    subjectKey: z.string().min(1).describe("Key of an ExamSubject in data/external-credit-rules.json."),
    score: z.number().nullable().describe("AP 1-5, IB 1-7, SAT-II 200-800. null for letter-graded exams."),
    grade: z.string().nullable().describe('Letter-graded exams (A-Level: "A*", "A", "B", ...). null otherwise.'),
    level: IbLevelSchema.nullable().describe("IB only."),
  })
  .meta({ id: "ExternalCreditInput", description: "What the student enters. resolveExternalCredit() turns it into an ExternalCredit." });
export type ExternalCreditInput = z.infer<typeof ExternalCreditInputSchema>;

export const ExternalCreditSchema = ExternalCreditInputSchema.extend({
  label: z.string().min(1).describe('"AP French Language and Culture"'),
  credits: z.number().min(0).describe("Advanced standing credit awarded by the rules table, before caps. 0 when the score does not qualify."),
  grantsAttributes: z.array(GeAttributeSchema).describe('GE attributes this exam satisfies, e.g. ["LANGUAGE"].'),
  qualifies: z.boolean().describe("credits > 0 or grantsAttributes non-empty."),
  duplicateKey: z.string().describe("Exams sharing this key duplicate each other (AP and IB English Literature); only one earns credit."),
  ruleIds: z.array(z.string()).describe("Ids of the rules in external-credit-rules.json that fired."),
  notes: z.array(z.string()),
}).meta({ id: "ExternalCredit" });
export type ExternalCredit = z.infer<typeof ExternalCreditSchema>;

export const OverrideSchema = z
  .object({
    requirementId: z.string().min(1),
    course: CourseIdSchema,
    reason: z.string().min(1),
    approvedBy: z.string().min(1).describe("Chair or dean who granted it. Rendered beside the result."),
  })
  .meta({ id: "Override", description: "Chair-granted substitution. Invisible to every data source, so manual. Marks the requirement satisfied by that course regardless of the rule; viaOverride=true." });
export type Override = z.infer<typeof OverrideSchema>;

export const StudentPlanSchema = z
  .object({
    schemaVersion: z.literal(PLAN_SCHEMA_VERSION).describe("Bump when the shape changes; the app migrates older plans on import."),
    catalogYear: CatalogYearSchema,
    matriculationTerm: TermIdSchema.nullable().describe("null when the student has not recorded it. The engine then infers it as the earliest known completed-course term, and falls back to bounded evaluation (docs/API.md 2.7) where the inference would change an answer."),
    studentType: StudentTypeSchema,
    completed: z.array(CompletedCourseSchema),
    planned: z.array(PlannedCourseSchema),
    externalCredits: z.array(ExternalCreditSchema),
    attestations: z.record(z.string(), z.boolean()).describe("requirementId (or attested rule id) -> student confirmed."),
    overrides: z.array(OverrideSchema),
    declarations: z.array(z.object({ programId: z.string().min(1), kind: z.enum(["major", "minor"]) })).describe("Empty in P0."),
  })
  .meta({ id: "StudentPlan", description: "Everything the student has told the app. Persisted in localStorage, exported as JSON, shared in a URL fragment. Never transmitted." });
export type StudentPlan = z.infer<typeof StudentPlanSchema>;

export function emptyPlan(catalogYear: string, matriculationTerm: z.infer<typeof TermIdSchema> | null = null, studentType: z.infer<typeof StudentTypeSchema> = "firstYear"): StudentPlan {
  return {
    schemaVersion: PLAN_SCHEMA_VERSION,
    catalogYear,
    matriculationTerm,
    studentType,
    completed: [],
    planned: [],
    externalCredits: [],
    attestations: {},
    overrides: [],
    declarations: [],
  };
}
