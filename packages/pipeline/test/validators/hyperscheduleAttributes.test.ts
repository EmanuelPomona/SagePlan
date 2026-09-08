import { describe, expect, test } from "vitest";
import type { Course, GeAttribute, Section } from "@gradguide/shared";
import { checkHyperscheduleAttributes } from "../../src/validators/hyperscheduleAttributes.ts";

const course = (dept: string, n: number, aff: string, attrs: GeAttribute[]): Course => ({
  id: { department: dept, courseNumber: n, suffix: "", affiliation: aff },
  title: `${dept} ${n}`, description: "", department: dept,
  credits: { min: 1, max: 1, repeatable: false, maxRepeats: 0 },
  attributes: attrs, gradeMode: "", prereqText: null, prereqRule: null,
  catalogYear: "2026-2027", sourceUrl: "https://catalog.pomona.edu/x", lastVerified: "2026-09-08T00:00:00Z",
});
const section = (dept: string, n: number, aff: string, geCodes: string[]): Section => ({
  course: { department: dept, courseNumber: n, suffix: "", affiliation: aff },
  sectionNumber: 1, term: { year: 2026, term: "FA" }, half: null,
  instructors: [], meetings: [], seatsTotal: 0, seatsFilled: 0, permCount: 0, status: "O", geCodes,
});

describe("checkHyperscheduleAttributes", () => {
  test("passes when the two sources agree", () => {
    const { check } = checkHyperscheduleAttributes([course("CSCI", 51, "PO", ["AREA_5"])], [section("CSCI", 51, "PO", ["1A5"])]);
    expect(check.status).toBe("pass");
    expect(check.count).toBe(0);
  });

  test("reports a section GE code the catalog attributes lack", () => {
    const { check, report } = checkHyperscheduleAttributes([course("HIST", 10, "PO", [])], [section("HIST", 10, "PO", ["1A3"])]);
    expect(check.count).toBe(1);
    expect(report).toContain("HIST 010 PO");
    expect(report).toContain("AREA_3");
  });

  test("reports a catalog attribute the sections do not carry", () => {
    const { check } = checkHyperscheduleAttributes([course("HIST", 10, "PO", ["AREA_3"])], [section("HIST", 10, "PO", [])]);
    expect(check.count).toBe(1);
  });

  test("ignores other colleges' codes on a section", () => {
    const { check } = checkHyperscheduleAttributes([course("CSCI", 51, "PO", ["AREA_5"])], [section("CSCI", 51, "PO", ["1A5", "4HSA"])]);
    expect(check.status).toBe("pass");
  });

  test("ignores a section whose course is not in the catalog", () => {
    const { check } = checkHyperscheduleAttributes([], [section("ZZZ", 1, "PO", ["1A1"])]);
    expect(check.count).toBe(0);
  });

  test("unions the codes across several sections of one course", () => {
    const { check } = checkHyperscheduleAttributes(
      [course("HIST", 10, "PO", ["AREA_3", "WRITING_INTENSIVE"])],
      [section("HIST", 10, "PO", ["1A3"]), section("HIST", 10, "PO", ["1WIR"])],
    );
    expect(check.status).toBe("pass");
  });

  test("warns rather than fails", () => {
    expect(checkHyperscheduleAttributes([course("HIST", 10, "PO", [])], [section("HIST", 10, "PO", ["1A3"])]).check.status).toBe("warn");
  });

  test("uses the id 'hyperschedule-attributes'", () => {
    expect(checkHyperscheduleAttributes([], []).check.id).toBe("hyperschedule-attributes");
  });
});
