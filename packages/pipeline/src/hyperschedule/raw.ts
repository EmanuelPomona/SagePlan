import { z } from "zod";

/** Loose shapes for the v4 fields we read. Hyperschedule is not our contract. */
export const RawCourseCodeSchema = z.object({
  department: z.string(),
  courseNumber: z.number(),
  suffix: z.string().optional(),
  affiliation: z.string(),
}).loose();

export const RawIdentifierSchema = RawCourseCodeSchema.extend({
  sectionNumber: z.number().optional(),
  year: z.number(),
  term: z.string(),
  half: z.union([z.object({ prefix: z.string(), number: z.number().optional() }).loose(), z.null()]).optional(),
}).loose();

export const RawScheduleSchema = z.object({
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  days: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
}).loose();

export const RawSectionSchema = z.object({
  identifier: RawIdentifierSchema,
  courseAreas: z.array(z.string()).optional(),
  credits: z.number().optional(),
  permCount: z.number().optional(),
  seatsTotal: z.number().optional(),
  seatsFilled: z.number().optional(),
  status: z.string().optional(),
  instructors: z.array(z.object({ name: z.string().optional() }).loose()).optional(),
  schedules: z.array(RawScheduleSchema).optional(),
  course: z.object({
    code: RawCourseCodeSchema.optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    primaryAssociation: z.string().optional(),
  }).loose().optional(),
}).loose();

export const RawHistorySchema = z.object({
  code: RawCourseCodeSchema,
  terms: z.array(z.object({ year: z.number(), term: z.string() }).loose()),
}).loose();

export const RawTermSchema = z.object({ year: z.number(), term: z.string() }).loose();

export type RawSection = z.infer<typeof RawSectionSchema>;
