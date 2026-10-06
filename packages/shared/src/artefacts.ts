import { z } from "zod";
import { CatalogYearSchema, GeAttributeSchema, TermCodeSchema, TermIdSchema } from "./ids.ts";
import { CourseSchema, OfferingHistorySchema, SectionSchema } from "./catalog.ts";
import { ConfidenceSchema, SourceRefSchema } from "./program.ts";
import { ExamKindSchema, IbLevelSchema } from "./plan.ts";

/** Envelopes for every generated file in /data, and the hand-written rules file. */

export const ARTEFACT_SCHEMA_VERSION = 1 as const;

export const ArtefactMetaSchema = z
  .object({
    schemaVersion: z.literal(ARTEFACT_SCHEMA_VERSION),
    generator: z.string().min(1).describe('"@sageplan/pipeline@0.1.0 catalog"'),
    generatedAt: z.iso.datetime().describe("When this file was written. The UI shows 'data as of'."),
    fetchedAt: z.iso.datetime().describe("When the upstream source was fetched."),
    sourceUrl: z.url().describe("The upstream request that produced this file."),
    catalogYear: CatalogYearSchema,
  })
  .meta({ id: "ArtefactMeta", description: "Provenance stamp carried by every generated artefact." });
export type ArtefactMeta = z.infer<typeof ArtefactMetaSchema>;

export const CatalogArtefactSchema = z
  .object({ meta: ArtefactMetaSchema, courses: z.array(CourseSchema).min(1) })
  .meta({ id: "CatalogArtefact", description: "data/catalog.json. Non-empty by contract: the pipeline fails rather than write an empty catalog." });
export type CatalogArtefact = z.infer<typeof CatalogArtefactSchema>;

export const SectionsArtefactSchema = z
  .object({ meta: ArtefactMetaSchema, term: TermIdSchema, sections: z.array(SectionSchema).min(1) })
  .meta({ id: "SectionsArtefact", description: "data/sections-{TERM}.json, one per term in PIPELINE_TERMS." });
export type SectionsArtefact = z.infer<typeof SectionsArtefactSchema>;

export const OfferingHistoryArtefactSchema = z
  .object({
    meta: ArtefactMetaSchema,
    asOfTerm: TermIdSchema.describe("The term whose offering-history endpoint was fetched."),
    knownTerms: z.array(TermIdSchema).describe("Every term Hyperschedule knows about, ascending. The UI draws the ribbon over the last eight."),
    history: z.array(OfferingHistorySchema).min(1),
  })
  .meta({ id: "OfferingHistoryArtefact", description: "data/offering-history.json" });
export type OfferingHistoryArtefact = z.infer<typeof OfferingHistoryArtefactSchema>;

export const ManifestSchema = z
  .object({
    schemaVersion: z.literal(ARTEFACT_SCHEMA_VERSION),
    generatedAt: z.iso.datetime(),
    catalogYear: CatalogYearSchema.describe("The catalog year the data describes. The UI compares it with today's date for the staleness banner."),
    catalog: z.object({ path: z.string(), fetchedAt: z.iso.datetime(), courseCount: z.number().int().min(1) }),
    sections: z.array(z.object({ term: TermCodeSchema, path: z.string(), fetchedAt: z.iso.datetime(), sectionCount: z.number().int().min(0) })),
    offeringHistory: z.object({ path: z.string(), fetchedAt: z.iso.datetime(), courseCount: z.number().int().min(1) }).nullable(),
    programs: z.array(z.object({ id: z.string(), path: z.string(), kind: z.enum(["general-education", "major", "minor"]), name: z.string(), confidence: ConfidenceSchema })),
    externalCreditRules: z.object({ path: z.string() }),
    upcomingTerms: z.array(TermCodeSchema).describe('Terms the UI offers in "What satisfies this?", ascending. Every entry has a sections file.'),
  })
  .meta({ id: "Manifest", description: "data/manifest.json. The first file the app loads. Lists every artefact, its freshness, and the terms available." });
export type Manifest = z.infer<typeof ManifestSchema>;

export const ExamSubjectSchema = z
  .object({
    key: z.string().regex(/^[a-z0-9-]+$/).describe('"ap-spanish-language"'),
    kind: ExamKindSchema,
    label: z.string().min(1),
    category: z.enum(["language", "other"]).describe("language: a language other than English; drives LANGUAGE attribute rules."),
    duration: z.enum(["year", "semester"]).describe("Year-long exams earn 1 credit, semester-long 0.5 (when they qualify)."),
    duplicateKey: z.string().min(1).describe('Exams that duplicate each other share it: "english-literature" for AP and IB English Literature.'),
    ibGroup: z.enum(["A", "B"]).nullable().describe("IB language exams: Language A (literature / language and literature) or Language B (acquisition). null for non-IB."),
    romanizedScript: z.boolean().optional().describe("SAT-II exams that test in Romanized writing (Chinese, Japanese, Korean) do not satisfy the language requirement."),
  })
  .meta({ id: "ExamSubject" });
export type ExamSubject = z.infer<typeof ExamSubjectSchema>;

export const ExamMatchSchema = z
  .object({
    kind: ExamKindSchema.optional(),
    category: z.enum(["language", "other"]).optional(),
    ibGroup: z.enum(["A", "B"]).optional(),
    levels: z.array(IbLevelSchema).optional().describe("IB: which levels this rule accepts."),
    minScore: z.number().optional(),
    minGrade: z.string().optional().describe('Letter-graded exams: minimum grade on gradeScale, e.g. "B".'),
    gradeScale: z.array(z.string()).optional().describe('Highest first, e.g. ["A*","A","B","C","D","E"].'),
    excludeRomanizedScript: z.boolean().optional(),
    subjectKeys: z.array(z.string()).optional().describe("Restrict to specific subjects."),
    excludeSubjectKeys: z.array(z.string()).optional().describe("Never match these subjects (A-Level language path excludes Chinese and Japanese)."),
  })
  .meta({ id: "ExamMatch", description: "All present fields must match (AND)." });
export type ExamMatch = z.infer<typeof ExamMatchSchema>;

export const ExternalCreditRuleSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    effect: z.enum(["credit", "attribute"]).describe("credit: award advanced standing credit by duration. attribute: grant GE attributes (satisfies a requirement without credit)."),
    match: ExamMatchSchema,
    grantsAttributes: z.array(GeAttributeSchema).optional().describe("For effect=attribute."),
    explanation: z.string().min(1),
    sourceQuote: z.string().min(1),
    sourceRef: SourceRefSchema,
    confidence: ConfidenceSchema,
  })
  .meta({ id: "ExternalCreditRule" });
export type ExternalCreditRule = z.infer<typeof ExternalCreditRuleSchema>;

export const ExternalCreditRulesSchema = z
  .object({
    schemaVersion: z.literal(ARTEFACT_SCHEMA_VERSION),
    catalogYear: CatalogYearSchema,
    subjects: z.array(ExamSubjectSchema).min(1),
    rules: z.array(ExternalCreditRuleSchema).min(1),
    caps: z.object({
      advancedStandingCredits: z.number().min(0),
      externalCredits: z.number().min(0),
    }).describe("Mirrors the credits-rule caps in the GE program; kept here so resolveExternalCredit can warn at entry time."),
    encodedBy: z.string().min(1),
    encodedOn: z.iso.date(),
    notes: z.string(),
  })
  .meta({ id: "ExternalCreditRules", description: "data/external-credit-rules.json. Hand-written. Exam thresholds -> credits and granted attributes." });
export type ExternalCreditRules = z.infer<typeof ExternalCreditRulesSchema>;

export const ValidationCheckSchema = z
  .object({
    id: z.string().min(1),
    status: z.enum(["pass", "warn", "fail"]),
    summary: z.string(),
    count: z.number().int().min(0),
    details: z.array(z.string()),
  })
  .meta({ id: "ValidationCheck" });
export type ValidationCheck = z.infer<typeof ValidationCheckSchema>;

export const ValidationReportSchema = z
  .object({
    generatedAt: z.iso.datetime(),
    generator: z.string().min(1),
    checks: z.array(ValidationCheckSchema),
    ok: z.boolean().describe("false when any check failed."),
  })
  .meta({ id: "ValidationReport", description: "data/reports/validation.json. For humans and CI, never loaded by the app." });
export type ValidationReport = z.infer<typeof ValidationReportSchema>;
