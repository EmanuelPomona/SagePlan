import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { CourseSchema, courseKey } from "@gradguide/shared";
import { normaliseCourse, isIssue, normaliseAll } from "../../src/coursedog/normalise.ts";

const CTX = { catalogYear: "2026-2027" as const, fetchedAt: "2026-09-08T12:00:00Z" };
const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/coursedog-sample.json", import.meta.url), "utf8"),
) as { data: Record<string, unknown>[] };

const byCode = (code: string) => fixture.data.find((r) => r.code === code)!;
const course = (code: string) => {
  const r = normaliseCourse(byCode(code), CTX);
  if (isIssue(r)) throw new Error(`expected a Course for ${code}, got issue: ${r.reason}`);
  return r;
};

describe("normaliseCourse", () => {
  test("produces a Course that satisfies the shared schema", () => {
    expect(CourseSchema.safeParse(course("ID 001 PO")).success).toBe(true);
  });

  test("decomposes identity from subjectCode and courseNumber, not the unspaced code string", () => {
    // Coursedog writes "POLI130 PO" with no space; CourseId must still decompose.
    const c = course("POLI130 PO");
    expect(c.id).toEqual({ department: "POLI", courseNumber: 130, suffix: "", affiliation: "PO" });
    expect(courseKey(c.id)).toBe("POLI 130 PO");
  });

  test("keeps a letter suffix out of the course number", () => {
    const c = course("POLI190D PO");
    expect(c.id.courseNumber).toBe(190);
    expect(c.id.suffix).toBe("D");
    expect(courseKey(c.id)).toBe("POLI 190D PO");
  });

  test("zero-pads a low course number in the canonical key", () => {
    expect(courseKey(course("ID 001 PO").id)).toBe("ID 001 PO");
  });

  test("keeps a 0.25 PE course at exactly 0.25 credits", () => {
    const c = course("PE 175W PO");
    expect(c.credits.min).toBe(0.25);
    expect(c.credits.max).toBe(0.25);
    expect(c.attributes).toContain("PHYSICAL_EDUCATION");
  });

  test("keeps a half course at 0.5 credits", () => {
    const c = course("PE 094 PO");
    expect(c.credits.min).toBe(0.5);
    expect(c.credits.max).toBe(0.5);
  });

  test("reads the second upstream credit shape {value} as min = max = value", () => {
    // 182 Active records carry creditHours:{value} instead of {min,max}.
    const c = course("ART126D PO");
    expect(c.credits.min).toBe(1);
    expect(c.credits.max).toBe(1);
  });

  test("preserves a credit range honestly rather than collapsing it", () => {
    const c = course("PSYC098 PO");
    expect(c.credits.min).toBe(0.5);
    expect(c.credits.max).toBe(1);
  });

  test("carries repeatability through", () => {
    const c = course("PE 175W PO");
    expect(typeof c.credits.repeatable).toBe("boolean");
    expect(c.credits.maxRepeats).toBeGreaterThanOrEqual(0);
  });

  test("maps GE attributes and drops DDP", () => {
    const c = course("POLI010 PO");
    expect(c.attributes).toEqual(["AREA_2"]);
  });

  test("keeps several GE attributes", () => {
    expect(course("POLI177 PO").attributes).toEqual(
      expect.arrayContaining(["AREA_2", "ANALYZING_DIFFERENCE", "SPEAKING_INTENSIVE"]),
    );
  });

  test("yields an empty string, never undefined, for a missing description", () => {
    const withoutDescription = fixture.data.find((r) => !String(r.description ?? "").trim())!;
    const c = normaliseCourse(withoutDescription, CTX);
    expect(isIssue(c)).toBe(false);
    if (!isIssue(c)) expect(c.description).toBe("");
  });

  test("sets prereqText from structured requisites and leaves prereqRule null in P0", () => {
    const c = course("POLI130 PO");
    expect(c.prereqText).toBeTruthy();
    expect(c.prereqText).toContain("POLI");
    expect(c.prereqRule).toBeNull();
  });

  test("sets prereqText to null when there are no requisites", () => {
    expect(course("ID 001 PO").prereqText).toBeNull();
  });

  test("stamps catalogYear, sourceUrl and lastVerified", () => {
    const c = course("ID 001 PO");
    expect(c.catalogYear).toBe("2026-2027");
    expect(c.sourceUrl).toBe("https://catalog.pomona.edu/courses/ID%20001%20PO");
    expect(c.lastVerified).toBe("2026-09-08T12:00:00Z");
  });

  test("rejects a record whose status is not Active", () => {
    const banked = fixture.data.find((r) => r.status === "Banked")!;
    const r = normaliseCourse(banked, CTX);
    expect(isIssue(r)).toBe(true);
    if (isIssue(r)) expect(r.reason).toBe("not-active");
  });

  test("rejects an Inactive test record", () => {
    const inactive = fixture.data.find((r) => r.status === "Inactive")!;
    expect(isIssue(normaliseCourse(inactive, CTX))).toBe(true);
  });

  test("rejects a record with no title rather than inventing one", () => {
    const r = normaliseCourse({ ...byCode("ID 001 PO"), name: "  " }, CTX);
    expect(isIssue(r)).toBe(true);
    if (isIssue(r)) expect(r.reason).toBe("empty-title");
  });

  test("reports an unmapped GE-looking attribute as an issue instead of dropping it", () => {
    const r = normaliseCourse({ ...byCode("ID 001 PO"), attributes: ["PO Area 9 Requirement"] }, CTX);
    expect(isIssue(r)).toBe(true);
    if (isIssue(r)) expect(r.reason).toBe("unmapped-attribute");
  });
});

describe("normaliseAll", () => {
  test("returns only Active courses and counts the rest", () => {
    const { courses, issues } = normaliseAll(fixture.data, CTX);
    expect(courses.length).toBeGreaterThan(0);
    expect(courses.every((c) => c.id.affiliation.length >= 2)).toBe(true);
    expect(issues.filter((i) => i.reason === "not-active").length).toBe(2);
  });

  test("every returned course validates against CourseSchema", () => {
    const { courses } = normaliseAll(fixture.data, CTX);
    for (const c of courses) expect(CourseSchema.safeParse(c).success).toBe(true);
  });
});
