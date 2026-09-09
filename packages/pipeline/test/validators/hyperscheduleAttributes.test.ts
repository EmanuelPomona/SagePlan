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

describe("unknown Pomona GE codes reach the validation report", () => {
  // The bug this guards: unknownPomona was accumulated into a local counter that
  // only ever reached a log line. A new or renamed campus-1 code was therefore
  // dropped from every merged non-PO course with nothing to detect it.
  test("counts an unrecognised campus-1 code and names it", () => {
    const { check, report } = checkHyperscheduleAttributes(
      [course("CSCI", 51, "PO", ["AREA_5"])],
      [section("CSCI", 51, "PO", ["1A5", "1ZZZ"])],
    );
    expect(check.count).toBeGreaterThan(0);
    expect(check.details.join(" ")).toContain("1ZZZ");
    expect(report).toContain("1ZZZ");
  });

  test("does not treat another college's code as unknown", () => {
    const { check } = checkHyperscheduleAttributes(
      [course("CSCI", 51, "PO", ["AREA_5"])],
      [section("CSCI", 51, "PO", ["1A5", "4HSA"])],
    );
    expect(check.count).toBe(0);
  });

  test("reports an unknown code even on a course absent from the catalog", () => {
    const { check } = checkHyperscheduleAttributes([], [section("ZZZ", 1, "PO", ["1ZZZ"])]);
    expect(check.details.join(" ")).toContain("1ZZZ");
  });

  test("known non-attribute Pomona codes are not reported as unknown", () => {
    const { check } = checkHyperscheduleAttributes(
      [course("CSCI", 51, "PO", ["AREA_5"])],
      [section("CSCI", 51, "PO", ["1A5", "1DDP", "1P3"])],
    );
    expect(check.count).toBe(0);
  });
});

describe("unreadable term files narrow the check visibly", () => {
  test("reports a term file that could not be read", () => {
    const { check, report } = checkHyperscheduleAttributes([], [], ["sections-FA2026.json"]);
    expect(check.status).toBe("warn");
    expect(check.count).toBe(1);
    expect(report).toContain("sections-FA2026.json");
  });

  test("passes when everything agrees and every file was readable", () => {
    expect(checkHyperscheduleAttributes([], [], []).check.status).toBe("pass");
  });
});
