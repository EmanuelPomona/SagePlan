import { describe, expect, test } from "vitest";
import type { Course, GeAttribute } from "@sageplan/shared";
import { checkGeAgreement } from "../../src/validators/geAgreement.ts";
import type { RegistrarCourse } from "../../src/registrar/pivot.ts";

const course = (dept: string, n: number, aff: string, attrs: GeAttribute[], credits = 1): Course => ({
  id: { department: dept, courseNumber: n, suffix: "", affiliation: aff },
  title: `${dept} ${n}`, description: "", department: dept,
  credits: { min: credits, max: credits, repeatable: false, maxRepeats: 0 },
  attributes: attrs, gradeMode: "LP", prereqText: null, prereqRule: null,
  catalogYear: "2026-2027", sourceUrl: "https://catalog.pomona.edu/courses/x", lastVerified: "2026-09-08T00:00:00Z",
});
const reg = (entries: [string, GeAttribute[], string?][]) => {
  const m = new Map<string, RegistrarCourse>();
  for (const [key, attrs, aff] of entries) m.set(key, { attributes: new Set(attrs), title: key, affiliation: aff ?? "PO" });
  return m;
};

describe("checkGeAgreement", () => {
  test("passes when both sources agree", () => {
    const { check } = checkGeAgreement([course("CSCI", 51, "PO", ["AREA_5"])], reg([["CSCI 051 PO", ["AREA_5"]]]), 25);
    expect(check.status).toBe("pass");
    expect(check.count).toBe(0);
  });

  test("reports a divergence naming both sources when the areas differ", () => {
    const { check, report } = checkGeAgreement([course("HIST", 10, "PO", ["AREA_3"])], reg([["HIST 010 PO", ["AREA_2"]]]), 25);
    expect(check.status).toBe("warn");
    expect(check.count).toBe(1);
    expect(report).toContain("HIST 010 PO");
    expect(report).toContain("AREA_3");
    expect(report).toContain("AREA_2");
  });

  test("reports a PO course the Registrar export does not list", () => {
    const { check, report } = checkGeAgreement([course("NEW", 1, "PO", ["AREA_1"])], reg([]), 25);
    expect(check.count).toBe(1);
    expect(report).toContain("missing from Registrar export");
  });

  test("does not treat a non-PO Registrar course as a divergence", () => {
    const { check } = checkGeAgreement([], reg([["CSCI 005 HM", ["AREA_5"], "HM"]]), 25);
    expect(check.status).toBe("pass");
    expect(check.count).toBe(0);
  });

  test("does not compare non-PO catalog courses", () => {
    const { check } = checkGeAgreement([course("CSCI", 5, "HM", ["AREA_5"])], reg([]), 25);
    expect(check.count).toBe(0);
  });

  test("ignores a PO course carrying no attributes in either source", () => {
    const { check } = checkGeAgreement([course("ID", 1, "PO", [])], reg([["ID 001 PO", []]]), 25);
    expect(check.status).toBe("pass");
  });

  test("fails when the divergence count exceeds the configured maximum", () => {
    const courses = Array.from({ length: 30 }, (_, i) => course("XX", i + 1, "PO", ["AREA_1"]));
    const { check } = checkGeAgreement(courses, reg(courses.map((c, i) => [`XX ${String(i + 1).padStart(3, "0")} PO`, ["AREA_2"] as GeAttribute[]])), 25);
    expect(check.status).toBe("fail");
    expect(check.count).toBe(30);
  });

  test("warns, not fails, at exactly the maximum", () => {
    const courses = Array.from({ length: 25 }, (_, i) => course("XX", i + 1, "PO", ["AREA_1"]));
    const { check } = checkGeAgreement(courses, reg(courses.map((c, i) => [`XX ${String(i + 1).padStart(3, "0")} PO`, ["AREA_2"] as GeAttribute[]])), 25);
    expect(check.status).toBe("warn");
  });

  test("prefers neither source: the report carries an empty explanation column for the owner", () => {
    const { report } = checkGeAgreement([course("HIST", 10, "PO", ["AREA_3"])], reg([["HIST 010 PO", ["AREA_2"]]]), 25);
    expect(report).toContain("Explanation");
    expect(report.toLowerCase()).toContain("how to resolve");
  });

  test("uses the id 'ge-agreement'", () => {
    expect(checkGeAgreement([], reg([]), 25).check.id).toBe("ge-agreement");
  });
});

describe("checkGeAgreement is bidirectional", () => {
  // The bug this guards: the check only iterated the catalog, so a Pomona course
  // the Registrar tags but that never made it into catalog.json was invisible.
  // 25 such courses exist in the committed data (CSCI 051G PO among them).
  test("reports a Pomona course the Registrar tags but the catalog does not contain", () => {
    const { check, report } = checkGeAgreement([], reg([["CSCI 051G PO", ["AREA_5"]]]), 25);
    expect(check.count).toBe(1);
    expect(report).toContain("CSCI 051G PO");
    expect(report).toContain("missing from catalog");
  });

  test("does not report an untagged Registrar course that is absent from the catalog", () => {
    expect(checkGeAgreement([], reg([["HIST 010 PO", []]]), 25).check.count).toBe(0);
  });

  test("does not report a non-PO Registrar course absent from the catalog", () => {
    expect(checkGeAgreement([], reg([["CSCI 005 HM", ["AREA_5"], "HM"]]), 25).check.count).toBe(0);
  });

  test("does not double-report a course present in both sources", () => {
    const { check } = checkGeAgreement([course("CSCI", 51, "PO", ["AREA_5"])], reg([["CSCI 051 PO", ["AREA_5"]]]), 25);
    expect(check.count).toBe(0);
  });
});
