import type { CourseId, RequirementStatus } from "@sageplan/shared";

/** What every rule evaluator returns, before waivers and overrides are applied. */
export type Settlement = {
  status: RequirementStatus;
  satisfiedBy: CourseId[];
  remaining: { n: number; unit: "courses" | "credits" } | null;
  candidates: CourseId[];
  note?: string;
};
