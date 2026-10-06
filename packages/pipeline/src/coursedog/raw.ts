import { z } from "zod";

/**
 * The LOOSE upstream shape — only the fields we read.
 *
 * Deliberately permissive: Coursedog is not our contract and we do not want a
 * new upstream field, or a missing optional one, to fail the build. The strict
 * shape is `Course` in @sageplan/shared, and normalise.ts is the only bridge.
 * (contract-first: never let a provider's storage row become the contract.)
 */
export const RawCreditHoursSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
    /** Second upstream shape, seen on 182 Active records: {value} and no min/max. */
    value: z.number().optional(),
    operator: z.string().optional(),
  })
  .loose();

export const RawCoursedogCourseSchema = z
  .object({
    _id: z.string().optional(),
    code: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    subjectCode: z.string().optional(),
    courseNumber: z.union([z.string(), z.number()]).optional(),
    status: z.string().optional(),
    gradeMode: z.string().optional(),
    catalogPrint: z.boolean().optional(),
    departments: z.array(z.string()).optional(),
    attributes: z.array(z.string()).optional(),
    credits: z
      .object({
        repeatable: z.boolean().optional(),
        numberOfRepeats: z.number().optional(),
        creditHours: RawCreditHoursSchema.optional(),
      })
      .loose()
      .optional(),
    requisites: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();

export type RawCoursedogCourse = z.infer<typeof RawCoursedogCourseSchema>;

/** `{ listLength, data, limit, skip }` */
export const CoursedogSearchResponseSchema = z
  .object({
    listLength: z.number().optional(),
    data: z.array(RawCoursedogCourseSchema),
    limit: z.number().optional(),
    skip: z.number().optional(),
  })
  .loose();
