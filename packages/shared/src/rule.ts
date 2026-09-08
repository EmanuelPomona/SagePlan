import { z } from "zod";
import { CourseIdSchema, GeAttributeSchema, TermIdSchema, type CourseId, type GeAttribute, type TermId } from "./ids.ts";

/**
 * The Rule union, defined in full now. P0 evaluates course, attribute, credits,
 * gpa and attested. The remaining kinds are defined so the data format never
 * migrates; the engine returns `unverifiable` for them until majors land.
 * A requirement expressed as an `if` in TypeScript instead of one of these is a bug.
 */

export const ProvenanceSchema = z.enum(["pomona", "claremont", "abroad", "transfer"]).meta({
  id: "Provenance",
  description: "Where a completed course was taken. pomona: Pomona College. claremont: another Claremont College via cross-registration. abroad: a Pomona-run or Pomona-approved external study program. transfer: work at another institution posted as transfer credit.",
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const StudentTypeSchema = z.enum(["firstYear", "transfer"]).meta({ id: "StudentType" });
export type StudentType = z.infer<typeof StudentTypeSchema>;

export const CourseFilterSchema = z
  .object({
    provenance: z.array(ProvenanceSchema).optional().describe("Only completed courses with one of these provenances count."),
    attributes: z.array(GeAttributeSchema).optional().describe("Only courses carrying ALL of these attributes count."),
    minTerm: TermIdSchema.optional().describe("Only courses taken in this term or later count."),
    sinceMatriculation: z.boolean().optional().describe("Only courses taken in or after the student's matriculationTerm count. External (exam) credit never counts under this filter."),
    transferPolicy: z.enum(["never", "transferStudentsPreMatriculation"]).optional().describe("How provenance=transfer courses are treated when `provenance` would otherwise exclude them. transferStudentsPreMatriculation: they count only for studentType=transfer and only when taken before matriculationTerm (the Breadth/overlay rule for transfer students)."),
    partialCredit: z.enum(["include", "exclude"]).optional().describe("Whether courses worth less than one credit count. Default include."),
  })
  .meta({ id: "CourseFilter", description: "Narrows which completed courses a rule may count. All present fields must hold (AND)." });
export type CourseFilter = z.infer<typeof CourseFilterSchema>;

export const CourseSetRefSchema = z
  .object({
    id: z.string().min(1).describe('A named, versioned predicate, e.g. "upper-division-csci".'),
    department: z.string().optional(),
    numberMin: z.number().int().optional(),
    numberMax: z.number().int().optional(),
    affiliation: z.array(z.string()).optional(),
    excludeNumbers: z.array(z.tuple([z.number().int(), z.number().int()])).optional().describe("Inclusive ranges to drop, e.g. [[190,199]] to exclude senior exercises."),
  })
  .meta({ id: "CourseSetRef", description: "A named course-set predicate. Defined once, reused. Not an inline blob. Used by fromSet (deferred to P1)." });
export type CourseSetRef = z.infer<typeof CourseSetRefSchema>;

export const CreditCapsSchema = z
  .object({
    advancedStandingCredits: z.number().min(0).optional().describe("Max AP/IB/A-Level credits counted (catalog: 2)."),
    externalCredits: z.number().min(0).optional().describe("Max credits from work outside The Claremont Colleges, transfer AND advanced standing combined (catalog: 16)."),
    partialCreditCourseCredits: z.number().min(0).optional().describe("Max total credits from cumulative (partial-credit) courses (catalog: 2)."),
    partialCreditCourses: z.number().int().min(0).optional().describe("Max number of cumulative courses counted (catalog: 8)."),
  })
  .meta({ id: "CreditCaps", description: "Caps applied while summing credits. Data, so the catalog's limits live in the program JSON." });
export type CreditCaps = z.infer<typeof CreditCapsSchema>;

export type Rule =
  | { kind: "course"; course: CourseId; minGrade?: string }
  | { kind: "attribute"; attr: GeAttribute; n: number; unit?: "courses" | "credits"; filter?: CourseFilter; distinctTerms?: boolean }
  | { kind: "credits"; n: number; filter?: CourseFilter; includeExternal?: boolean; caps?: CreditCaps }
  | { kind: "gpa"; min: number; scope: "overall" | "program" }
  | { kind: "attested"; id: string; prompt: string }
  | { kind: "allOf"; rules: Rule[] }
  | { kind: "anyOf"; rules: Rule[] }
  | { kind: "chooseN"; n: number; unit: "courses" | "credits"; rules: Rule[] }
  | { kind: "fromSet"; n: number; set: CourseSetRef }
  | { kind: "milestone"; id: string; label: string }
  | { kind: "not"; rule: Rule };

export const P0_RULE_KINDS = ["course", "attribute", "credits", "gpa", "attested"] as const;
export const DEFERRED_RULE_KINDS = ["allOf", "anyOf", "chooseN", "fromSet", "milestone", "not"] as const;

export const RuleSchema: z.ZodType<Rule> = z
  .lazy(() =>
    z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("course"),
        course: CourseIdSchema,
        minGrade: z.string().optional().describe('Minimum letter grade, e.g. "C-". Absent: any passing grade or CR/P.'),
      }).describe("P0. Satisfied when the student completed exactly this course."),
      z.object({
        kind: z.literal("attribute"),
        attr: GeAttributeSchema,
        n: z.number().min(0),
        unit: z.enum(["courses", "credits"]).optional().describe("Count courses (default) or sum their credits (Area 6 partial-credit combinations)."),
        filter: CourseFilterSchema.optional(),
        distinctTerms: z.boolean().optional().describe("The counted courses must be from different terms (Physical Education)."),
      }).describe("P0. Satisfied by n completed courses carrying the attribute, or by attributes granted through qualifying external credit."),
      z.object({
        kind: z.literal("credits"),
        n: z.number().min(0),
        filter: CourseFilterSchema.optional(),
        includeExternal: z.boolean().optional().describe("Whether exam (advanced standing) credits count. Default: true when no filter is present, false otherwise."),
        caps: CreditCapsSchema.optional(),
      }).describe("P0. Satisfied when the summed credits of qualifying completed courses (plus external credit when included, subject to caps) reach n."),
      z.object({
        kind: z.literal("gpa"),
        min: z.number().min(0).max(4),
        scope: z.enum(["overall", "program"]),
      }).describe("P0. GPA over letter-graded courses with provenance pomona, claremont or abroad. CR/NC, P/NP and transfer grades are excluded."),
      z.object({
        kind: z.literal("attested"),
        id: z.string().min(1),
        prompt: z.string().min(1),
      }).describe("P0. Satisfied when plan.attestations[id] is true; otherwise unverifiable with the prompt surfaced."),
      z.object({ kind: z.literal("allOf"), rules: z.array(z.lazy(() => RuleSchema)) }).describe("DEFERRED to P1. Returns unverifiable in P0."),
      z.object({ kind: z.literal("anyOf"), rules: z.array(z.lazy(() => RuleSchema)) }).describe("DEFERRED to P1. Returns unverifiable in P0."),
      z.object({ kind: z.literal("chooseN"), n: z.number().min(0), unit: z.enum(["courses", "credits"]), rules: z.array(z.lazy(() => RuleSchema)) }).describe("DEFERRED to P1."),
      z.object({ kind: z.literal("fromSet"), n: z.number().min(0), set: CourseSetRefSchema }).describe("DEFERRED to P1."),
      z.object({ kind: z.literal("milestone"), id: z.string().min(1), label: z.string().min(1) }).describe("DEFERRED to P1."),
      z.object({ kind: z.literal("not"), rule: z.lazy(() => RuleSchema) }).describe("DEFERRED to P1."),
    ]),
  )
  .meta({ id: "Rule", description: "Requirement rule. Discriminated on `kind`. P0 evaluates course, attribute, credits, gpa, attested; the rest return unverifiable." });

export const OverlapPolicySchema = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("allowAll") }),
    z.object({ kind: z.literal("allowOnly"), requirementIds: z.array(z.string()) }),
    z.object({ kind: z.literal("denyOnly"), requirementIds: z.array(z.string()) }),
    z.object({ kind: z.literal("exclusive") }),
  ])
  .meta({ id: "OverlapPolicy", description: "Which other requirements may reuse a course already counted here. Enforced during assignment, not filtered afterwards. Default allowAll." });
export type OverlapPolicy = z.infer<typeof OverlapPolicySchema>;

export type { TermId };
