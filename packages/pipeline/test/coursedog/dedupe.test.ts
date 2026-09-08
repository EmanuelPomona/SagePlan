import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { courseKey, type Course } from "@gradguide/shared";
import { dedupeCourses } from "../../src/coursedog/dedupe.ts";
import { normaliseAll } from "../../src/coursedog/normalise.ts";

const CTX = { catalogYear: "2026-2027" as const, fetchedAt: "2026-09-08T12:00:00Z" };
const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/coursedog-sample.json", import.meta.url), "utf8"),
) as { data: Record<string, unknown>[] };

const base = (over: Partial<Course>): Course => ({
  id: { department: "POLI", courseNumber: 161, suffix: "", affiliation: "PO" },
  title: "Comparative Social Policy",
  description: "",
  department: "PPOL",
  credits: { min: 1, max: 1, repeatable: false, maxRepeats: 0 },
  attributes: [],
  gradeMode: "LP",
  prereqText: null,
  prereqRule: null,
  catalogYear: "2026-2027",
  sourceUrl: "https://catalog.pomona.edu/courses/POLI%20161%20PO",
  lastVerified: "2026-09-08T12:00:00Z",
  ...over,
});

describe("dedupeCourses", () => {
  test("leaves a list with no duplicates untouched", () => {
    const a = base({});
    const b = base({ id: { department: "POLI", courseNumber: 162, suffix: "", affiliation: "PO" } });
    const { courses, discarded } = dedupeCourses([a, b]);
    expect(courses).toHaveLength(2);
    expect(discarded).toHaveLength(0);
  });

  test("keeps the record carrying GE attributes over an empty one", () => {
    // The real failure this guards: POLI161 PO exists as a -2023 edition with
    // Area 2 + WI and a -2024 edition with attributes: []. Newest would be wrong.
    const withAttrs = base({ attributes: ["AREA_2", "WRITING_INTENSIVE"] });
    const withNone = base({ attributes: [] });
    const { courses, discarded } = dedupeCourses([withNone, withAttrs]);
    expect(courses).toHaveLength(1);
    expect(courses[0]!.attributes).toEqual(["AREA_2", "WRITING_INTENSIVE"]);
    expect(discarded).toHaveLength(1);
  });

  test("order of input does not change the winner", () => {
    const withAttrs = base({ attributes: ["AREA_2"] });
    const withNone = base({ attributes: [] });
    expect(dedupeCourses([withAttrs, withNone]).courses[0]!.attributes).toEqual(["AREA_2"]);
    expect(dedupeCourses([withNone, withAttrs]).courses[0]!.attributes).toEqual(["AREA_2"]);
  });

  test("falls back to a non-empty description when attributes tie", () => {
    const described = base({ description: "A real description." });
    const bare = base({ description: "" });
    expect(dedupeCourses([bare, described]).courses[0]!.description).toBe("A real description.");
  });

  test("falls back to the longer description when both are non-empty", () => {
    const short = base({ description: "Short." });
    const long = base({ description: "A considerably longer description of the course." });
    expect(dedupeCourses([short, long]).courses[0]!.description).toBe(long.description);
  });

  test("records every discarded record for the report", () => {
    const winner = base({ attributes: ["AREA_2"] });
    const loser = base({ attributes: [] });
    const { discarded } = dedupeCourses([winner, loser]);
    expect(discarded[0]!.key).toBe("POLI 161 PO");
    expect(discarded[0]!.keptAttributes).toEqual(["AREA_2"]);
    expect(discarded[0]!.discardedAttributes).toEqual([]);
  });

  test("output has one entry per courseKey", () => {
    const { courses } = dedupeCourses([base({}), base({}), base({ attributes: ["AREA_2"] })]);
    expect(courses).toHaveLength(1);
  });

  test("de-duplicates the real duplicated pair in the captured fixture without losing its GE tags", () => {
    const { courses } = normaliseAll(fixture.data, CTX);
    const dupKey = "POLI 161 PO";
    expect(courses.filter((c) => courseKey(c.id) === dupKey).length).toBe(2);
    const { courses: deduped } = dedupeCourses(courses);
    const kept = deduped.filter((c) => courseKey(c.id) === dupKey);
    expect(kept).toHaveLength(1);
    expect(kept[0]!.attributes.length).toBeGreaterThan(0);
  });

  test("every courseKey in the deduped fixture is unique", () => {
    const { courses } = normaliseAll(fixture.data, CTX);
    const { courses: deduped } = dedupeCourses(courses);
    const keys = deduped.map((c) => courseKey(c.id));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
