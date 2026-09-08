import { z } from "zod";
import { CourseIdSchema, type CourseId } from "./ids.ts";
import { ConfidenceSchema, type Confidence } from "./program.ts";

export const RequirementStatusSchema = z.enum(["satisfied", "partial", "unmet", "unverifiable"]).meta({
  id: "RequirementStatus",
  description: "unverifiable is a first-class status, never an error: an unimplemented rule kind, an unconfirmed attestation, or a rule whose text could not be encoded.",
});
export type RequirementStatus = z.infer<typeof RequirementStatusSchema>;

export type Result = {
  programId: string;
  requirementId: string;
  status: RequirementStatus;
  satisfiedBy: CourseId[];
  remaining: { n: number; unit: "courses" | "credits" } | null;
  candidates: CourseId[];
  children: Result[];
  viaOverride?: boolean;
  viaAttestation?: boolean;
  waived?: boolean;
  confidence?: Confidence;
  note?: string;
  violations?: string[];
};

export const ResultSchema: z.ZodType<Result> = z
  .lazy(() =>
    z.object({
      programId: z.string().min(1),
      requirementId: z.string().min(1),
      status: RequirementStatusSchema,
      satisfiedBy: z.array(CourseIdSchema).describe("The actual assignment chosen. Empty for unmet, for gpa, and for waived."),
      remaining: z.object({ n: z.number().min(0), unit: z.enum(["courses", "credits"]) }).nullable().describe("How much is still owed, when the rule counts something. null for gpa, course, attested."),
      candidates: z.array(CourseIdSchema).describe('Catalog courses that could satisfy this requirement and are not yet used. Powers "What satisfies this?". The UI intersects with sections-{term}.'),
      children: z.array(z.lazy(() => ResultSchema)),
      viaOverride: z.boolean().optional(),
      viaAttestation: z.boolean().optional(),
      waived: z.boolean().optional().describe("The requirement does not apply to this student (appliesWhen). Reported satisfied."),
      confidence: ConfidenceSchema.optional().describe("Copied from the requirement or program so the UI can flag draft encodings."),
      note: z.string().optional().describe('e.g. "rule kind \'chooseN\' not yet supported", or a constraint violation.'),
      violations: z.array(z.string()).optional().describe("Program constraint ids this assignment violates, if any."),
    }),
  )
  .meta({ id: "Result", description: "The engine's verdict for one requirement. One per requirement per evaluated program, in program order." });
