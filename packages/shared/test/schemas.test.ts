import { describe, expect, it } from "vitest";
import { ProgramSchema, RuleSchema, StudentPlanSchema, emptyPlan, gradeAtLeast, gradePoints, isPassing } from "../src/index.ts";

describe("Rule", () => {
  it("accepts every P0 kind and the deferred kinds, recursively", () => {
    const ok = RuleSchema.safeParse({
      kind: "allOf",
      rules: [
        { kind: "course", course: { department: "ID", courseNumber: 1, suffix: "", affiliation: "PO" } },
        { kind: "attribute", attr: "AREA_3", n: 1, filter: { provenance: ["pomona", "claremont"] } },
        { kind: "credits", n: 32, caps: { advancedStandingCredits: 2 } },
        { kind: "gpa", min: 2, scope: "overall" },
        { kind: "attested", id: "x", prompt: "y" },
        { kind: "not", rule: { kind: "milestone", id: "m", label: "M" } },
        { kind: "chooseN", n: 2, unit: "courses", rules: [{ kind: "fromSet", n: 1, set: { id: "ud-csci", department: "CSCI", numberMin: 100 } }] },
      ],
    });
    expect(ok.success).toBe(true);
  });
  it("rejects an unknown kind", () => {
    expect(RuleSchema.safeParse({ kind: "checkGeneralEducation" }).success).toBe(false);
  });
});

describe("StudentPlan", () => {
  it("emptyPlan validates and is schemaVersion 1", () => {
    const p = emptyPlan("2026-2027", { year: 2025, term: "FA" });
    expect(StudentPlanSchema.parse(p).schemaVersion).toBe(1);
  });
  it("rejects a plan from a future schema version", () => {
    const p = { ...emptyPlan("2026-2027", { year: 2025, term: "FA" }), schemaVersion: 2 };
    expect(StudentPlanSchema.safeParse(p).success).toBe(false);
  });
});

describe("Program", () => {
  it("requires a verbatim sourceQuote and sourceRef on every requirement", () => {
    const r = ProgramSchema.safeParse({
      id: "fake", name: "Fake", kind: "major", catalogYear: "2026-2027", confidence: "draft",
      sourceUrl: "https://catalog.pomona.edu/", encodedBy: "t", encodedOn: "2026-09-08", notes: "",
      requirements: [{ id: "a", label: "A", explanation: "x", rule: { kind: "gpa", min: 2, scope: "overall" }, overlapPolicy: { kind: "allowAll" } }],
    });
    expect(r.success).toBe(false);
  });
});

describe("grades", () => {
  it("uses the catalog scale", () => {
    expect(gradePoints("A")).toBe(4);
    expect(gradePoints("A-")).toBe(3.67);
    expect(gradePoints("C-")).toBe(1.67);
    expect(gradePoints("CR")).toBeNull();
  });
  it("compares letter grades and treats CR/P as passing", () => {
    expect(gradeAtLeast("B", "C-")).toBe(true);
    expect(gradeAtLeast("D", "C-")).toBe(false);
    expect(gradeAtLeast("CR", "C-")).toBe(false);
    expect(isPassing("CR")).toBe(true);
    expect(isPassing("NC")).toBe(false);
    expect(isPassing("F")).toBe(false);
  });
});
