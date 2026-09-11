import { describe, expect, test } from "vitest";
import type { Course, GeAttribute } from "@gradguide/shared";
import { checkExclusionAnomalies } from "../../src/validators/exclusionAnomalies.ts";

const course = (dept: string, n: number, attrs: GeAttribute[], credits = 1): Course => ({
  id: { department: dept, courseNumber: n, suffix: "", affiliation: "PO" },
  title: `${dept} ${n}`, description: "", department: dept,
  credits: { min: credits, max: credits, repeatable: false, maxRepeats: 0 },
  attributes: attrs, gradeMode: "LP", prereqText: null, prereqRule: null,
  catalogYear: "2026-2027", sourceUrl: "https://catalog.pomona.edu/courses/x", lastVerified: "2026-09-08T00:00:00Z",
});

describe("checkExclusionAnomalies", () => {
  test("lists a senior exercise (190-199) carrying an Area tag", () => {
    const { check, report } = checkExclusionAnomalies([course("POLI", 195, ["AREA_1"])]);
    expect(check.count).toBe(1);
    expect(report).toContain("POLI 195 PO");
  });

  test("does not list a 189 course", () => {
    expect(checkExclusionAnomalies([course("POLI", 189, ["AREA_1"])]).check.count).toBe(0);
  });

  test("does not list a senior exercise with no Area tag", () => {
    expect(checkExclusionAnomalies([course("POLI", 195, ["WRITING_INTENSIVE"])]).check.count).toBe(0);
  });

  test("lists a partial-credit course carrying a non-Area-6 Area tag", () => {
    const { check, report } = checkExclusionAnomalies([course("MUS", 20, ["AREA_2"], 0.5)]);
    expect(check.count).toBe(1);
    expect(report).toContain("MUS 020 PO");
  });

  test("does not list a partial-credit Area 6 course", () => {
    expect(checkExclusionAnomalies([course("MUS", 20, ["AREA_6"], 0.5)]).check.count).toBe(0);
  });

  test("does not list a full-credit course with any Area tag", () => {
    expect(checkExclusionAnomalies([course("MUS", 20, ["AREA_2"], 1)]).check.count).toBe(0);
  });

  test("lists a course carrying two Area tags", () => {
    const { check, report } = checkExclusionAnomalies([course("THEA", 85, ["AREA_1", "AREA_6"])]);
    expect(check.count).toBe(1);
    expect(report).toContain("two areas");
  });

  test("warns rather than fails: these are for human review", () => {
    expect(checkExclusionAnomalies([course("POLI", 195, ["AREA_1"])]).check.status).toBe("warn");
  });

  test("passes when there is nothing anomalous", () => {
    expect(checkExclusionAnomalies([course("CSCI", 51, ["AREA_5"])]).check.status).toBe("pass");
  });

  test("uses the id 'exclusion-anomalies'", () => {
    expect(checkExclusionAnomalies([]).check.id).toBe("exclusion-anomalies");
  });
});

describe("checkExclusionAnomalies with the Registrar as a second source", () => {
  const reg = (attrs: GeAttribute[]) =>
    new Map([["POLI 195 PO", { attributes: new Set(attrs), title: "x", affiliation: "PO" }]]);

  test("flags an Area tag the Registrar carries even when Coursedog does not", () => {
    const { check, report } = checkExclusionAnomalies([course("POLI", 195, [])], reg(["AREA_1"]));
    expect(check.count).toBe(1);
    expect(report).toContain("registrar");
  });

  test("marks a tag both sources carry as 'both'", () => {
    const { report } = checkExclusionAnomalies([course("POLI", 195, ["AREA_1"])], reg(["AREA_1"]));
    expect(report).toContain("both");
  });

  test("still works with no Registrar map supplied", () => {
    expect(checkExclusionAnomalies([course("POLI", 195, ["AREA_1"])]).check.count).toBe(1);
  });
});

describe("partial-credit detection uses the minimum, not the maximum", () => {
  const ranged = (min: number, max: number, attrs: GeAttribute[]): Course => ({
    id: { department: "GEOL", courseNumber: 189, suffix: "V", affiliation: "PO" },
    title: "Field Studies", description: "", department: "GEOL",
    credits: { min, max, repeatable: false, maxRepeats: 0 },
    attributes: attrs, gradeMode: "", prereqText: null, prereqRule: null,
    catalogYear: "2026-2027", sourceUrl: "https://catalog.pomona.edu/x", lastVerified: "2026-09-08T00:00:00Z",
  });

  // H-4: GEOL 189V PO is 0.5-1 with AREA_4. Testing credits.max < 1 skipped it,
  // so a real anomaly never reached the report.
  test("flags a 0.5-1 course carrying a non-Area-6 Area tag", () => {
    const { check, report } = checkExclusionAnomalies([ranged(0.5, 1, ["AREA_4"])]);
    expect(check.count).toBe(1);
    expect(report).toContain("GEOL 189V PO");
  });

  test("does not flag a 0.5-1 course whose only Area is Area 6", () => {
    expect(checkExclusionAnomalies([ranged(0.5, 1, ["AREA_6"])]).check.count).toBe(0);
  });

  test("still flags a flat 0.5-credit course", () => {
    expect(checkExclusionAnomalies([ranged(0.5, 0.5, ["AREA_2"])]).check.count).toBe(1);
  });

  test("does not flag a full-credit course", () => {
    expect(checkExclusionAnomalies([ranged(1, 1, ["AREA_2"])]).check.count).toBe(0);
  });
});
