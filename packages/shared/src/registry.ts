import type { z } from "zod";
import * as ids from "./ids.ts";
import * as rule from "./rule.ts";
import * as catalog from "./catalog.ts";
import * as program from "./program.ts";
import * as plan from "./plan.ts";
import * as result from "./result.ts";
import * as artefacts from "./artefacts.ts";

/** Every named schema, by its OpenAPI component name. The emitter and the artefact validator iterate this. */
export const SCHEMAS: Readonly<Record<string, z.ZodType>> = {
  Affiliation: ids.AffiliationSchema,
  CourseId: ids.CourseIdSchema,
  TermSeason: ids.TermSeasonSchema,
  TermId: ids.TermIdSchema,
  TermCode: ids.TermCodeSchema,
  CatalogYear: ids.CatalogYearSchema,
  GeAttribute: ids.GeAttributeSchema,
  Provenance: rule.ProvenanceSchema,
  StudentType: rule.StudentTypeSchema,
  CourseFilter: rule.CourseFilterSchema,
  CourseSetRef: rule.CourseSetRefSchema,
  CreditCaps: rule.CreditCapsSchema,
  Rule: rule.RuleSchema,
  OverlapPolicy: rule.OverlapPolicySchema,
  Course: catalog.CourseSchema,
  Meeting: catalog.MeetingSchema,
  Section: catalog.SectionSchema,
  OfferingHistory: catalog.OfferingHistorySchema,
  Confidence: program.ConfidenceSchema,
  SourceRef: program.SourceRefSchema,
  Requirement: program.RequirementSchema,
  ProgramConstraint: program.ProgramConstraintSchema,
  Advisory: program.AdvisorySchema,
  Program: program.ProgramSchema,
  GradeMode: plan.GradeModeSchema,
  CompletedCourse: plan.CompletedCourseSchema,
  PlannedCourse: plan.PlannedCourseSchema,
  ExamKind: plan.ExamKindSchema,
  IbLevel: plan.IbLevelSchema,
  ExternalCreditInput: plan.ExternalCreditInputSchema,
  ExternalCredit: plan.ExternalCreditSchema,
  Override: plan.OverrideSchema,
  StudentPlan: plan.StudentPlanSchema,
  RequirementStatus: result.RequirementStatusSchema,
  Result: result.ResultSchema,
  ArtefactMeta: artefacts.ArtefactMetaSchema,
  CatalogArtefact: artefacts.CatalogArtefactSchema,
  SectionsArtefact: artefacts.SectionsArtefactSchema,
  OfferingHistoryArtefact: artefacts.OfferingHistoryArtefactSchema,
  Manifest: artefacts.ManifestSchema,
  ExamSubject: artefacts.ExamSubjectSchema,
  ExamMatch: artefacts.ExamMatchSchema,
  ExternalCreditRule: artefacts.ExternalCreditRuleSchema,
  ExternalCreditRules: artefacts.ExternalCreditRulesSchema,
  ValidationCheck: artefacts.ValidationCheckSchema,
  ValidationReport: artefacts.ValidationReportSchema,
};

/** Static artefact paths the web app fetches, relative to its own origin. The contract for docs/API.md and openapi.yaml. */
export const ARTEFACT_PATHS = {
  manifest: { path: "/data/manifest.json", schema: "Manifest" },
  catalog: { path: "/data/catalog.json", schema: "CatalogArtefact" },
  sections: { path: "/data/sections-{term}.json", schema: "SectionsArtefact" },
  offeringHistory: { path: "/data/offering-history.json", schema: "OfferingHistoryArtefact" },
  program: { path: "/data/programs/{programId}.json", schema: "Program" },
  externalCreditRules: { path: "/data/external-credit-rules.json", schema: "ExternalCreditRules" },
} as const;
