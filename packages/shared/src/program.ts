import { z } from "zod";
import { CatalogYearSchema, GeAttributeSchema } from "./ids.ts";
import { OverlapPolicySchema, RuleSchema, StudentTypeSchema } from "./rule.ts";

/** Hand-written, reviewed, committed. GE is Program #1; a major is the same type. */

export const ConfidenceSchema = z.enum(["verified", "draft", "unverified"]).meta({
  id: "Confidence",
  description: "verified: rule text checked against the catalog and cross-checked. draft: encoded from the catalog but with an interpretation the Registrar has not confirmed. unverified: encoded from a secondary source.",
});
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const SourceRefSchema = z
  .object({
    slug: z.string().min(1).describe("Snapshot slug under data/sources/catalog-pages/, whose text must contain sourceQuote verbatim (whitespace-normalised)."),
    url: z.url(),
  })
  .meta({ id: "SourceRef" });
export type SourceRef = z.infer<typeof SourceRefSchema>;

export const RequirementSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    label: z.string().min(1).describe('"Breadth Area 3"'),
    explanation: z.string().min(1).describe("User-facing plain English in the tool's own voice."),
    sourceQuote: z.string().min(1).describe("VERBATIM catalog text. Always rendered beside the result. Validated as a substring of the referenced snapshot."),
    sourceRef: SourceRefSchema,
    rule: RuleSchema,
    overlapPolicy: OverlapPolicySchema,
    appliesWhen: z.object({ studentType: z.array(StudentTypeSchema).optional() }).optional().describe("Applicability, as data. A requirement that does not apply to the student is reported satisfied with waived=true."),
    attestable: z.object({ prompt: z.string().min(1) }).optional().describe("Escape hatch: the student may self-certify this requirement is met another way. Result carries viaAttestation=true and is rendered as a manual result."),
    confidence: ConfidenceSchema.optional().describe("Overrides the program-level confidence for this requirement."),
    grantedByAttributes: z.array(GeAttributeSchema).optional().describe("Informational: which granted external-credit attributes can satisfy this requirement (the attribute rule already handles it)."),
  })
  .meta({ id: "Requirement" });
export type Requirement = z.infer<typeof RequirementSchema>;

export const ProgramConstraintSchema = z
  .discriminatedUnion("kind", [
    z.object({
      kind: z.literal("distinctDepartments"),
      requirementIds: z.array(z.string()).min(2),
      explanation: z.string().min(1),
      sourceQuote: z.string().min(1),
      sourceRef: SourceRefSchema,
    }).describe("Courses assigned to these requirements must come from pairwise different departments (CourseId.department). Catalog: no two Breadth areas from the same department."),
  ])
  .meta({ id: "ProgramConstraint", description: "A cross-requirement constraint enforced during assignment. Data, not code." });
export type ProgramConstraint = z.infer<typeof ProgramConstraintSchema>;

export const AdvisorySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    label: z.string().min(1),
    text: z.string().min(1).describe("Plain-English advisory shown to the student. Not evaluated."),
    sourceQuote: z.string().min(1),
    sourceRef: SourceRefSchema,
  })
  .meta({ id: "Advisory", description: "A rule the engine does not evaluate in P0 (needs term-sequence reasoning or is a recommendation). Rendered as a note." });
export type Advisory = z.infer<typeof AdvisorySchema>;

export const ProgramSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/).describe('"general-education-2026"'),
    name: z.string().min(1),
    kind: z.enum(["general-education", "major", "minor"]),
    catalogYear: CatalogYearSchema,
    requirements: z.array(RequirementSchema).min(1),
    constraints: z.array(ProgramConstraintSchema).optional(),
    advisories: z.array(AdvisorySchema).optional(),
    confidence: ConfidenceSchema,
    sourceUrl: z.url(),
    encodedBy: z.string().min(1),
    encodedOn: z.iso.date(),
    notes: z.string(),
  })
  .meta({ id: "Program", description: "A set of requirements. General education, a major and a minor are all this type." });
export type Program = z.infer<typeof ProgramSchema>;
