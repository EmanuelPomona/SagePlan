import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { CatalogArtefactSchema, ProgramSchema, ResultSchema, StudentPlanSchema } from "@gradguide/shared";
import type { Course, Program, Result, StudentPlan } from "@gradguide/shared";
import { evaluate } from "../src/index.ts";

const at = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const read = (rel: string) => JSON.parse(readFileSync(at(rel), "utf8"));

const GE: Program = ProgramSchema.parse(read("../../../data/programs/general-education-2026.json"));
const FAKE_MAJOR: Program = ProgramSchema.parse(read("./fixtures/programs/fake-major.json"));
const GPA_SCOPES: Program = ProgramSchema.parse(read("./fixtures/programs/gpa-scopes.json"));
const DEFERRED_MAJOR: Program = ProgramSchema.parse(read("./fixtures/programs/deferred-major.json"));
const CATALOG: Course[] = CatalogArtefactSchema.parse(read("./fixtures/catalog.fixture.json")).courses;

/** Which programs each fixture is evaluated against. */
const FIXTURES: { id: string; programs: Program[]; describes: string }[] = [
  { id: "F-01", programs: [GE], describes: "on-track student: CI, five areas, WI, AD, one PE" },
  { id: "F-02", programs: [GE], describes: "transfer student with pre-matriculation Breadth" },
  { id: "F-03", programs: [GE], describes: "AP and IB credit, duplicate pair, advanced-standing cap" },
  { id: "F-03b", programs: [GE], describes: "exam threshold boundaries" },
  { id: "F-03c", programs: [GE], describes: "IB Language A is the ONLY thing that could satisfy Language" },
  { id: "F-04", programs: [GE], describes: "chair-granted override" },
  { id: "F-05", programs: [GE], describes: "one course short of Area 4" },
  { id: "F-06", programs: [GE], describes: "assignment conflict: rare AD course also carries Area 3" },
  { id: "F-07", programs: [GE, DEFERRED_MAJOR], describes: "deferred rule kinds beside GE" },
  { id: "F-08", programs: [GE, FAKE_MAJOR], describes: "fake major using only P0 rule kinds" },
  { id: "F-09", programs: [GE], describes: "distinctDepartments: two Dance courses" },
  { id: "F-10", programs: [GE], describes: "one course tagged both WI and SI" },
  { id: "F-11", programs: [GE], describes: "two PE courses in the same term" },
  { id: "F-12", programs: [GE], describes: "empty plan" },
  { id: "F-13", programs: [GE], describes: "the default v1 record: course codes only, no terms, no grades" },
  { id: "F-13b", programs: [GE], describes: "two PE courses whose terms are unknown" },
  { id: "F-13c", programs: [GE], describes: "a transfer course with no term: the one case that is genuinely unknown" },
  { id: "F-14", programs: [GPA_SCOPES], describes: "gpa scope: overall evaluates, program is deferred" },
];

const UPDATE = process.env.UPDATE_GOLDEN === "1";

describe("golden fixtures", () => {
  for (const { id, programs, describes } of FIXTURES) {
    test(`${id} — ${describes}`, () => {
      const plan: StudentPlan = StudentPlanSchema.parse(read(`./fixtures/plans/${id}.json`));
      const actual: Result[] = evaluate(plan, programs, CATALOG);

      for (const r of actual) expect(() => ResultSchema.parse(r)).not.toThrow();

      const goldenPath = at(`./golden/${id}.json`);
      if (UPDATE) {
        writeFileSync(goldenPath, `${JSON.stringify(actual, null, 2)}\n`);
      }
      expect(existsSync(goldenPath), `missing golden for ${id}; run UPDATE_GOLDEN=1`).toBe(true);
      expect(actual).toEqual(JSON.parse(readFileSync(goldenPath, "utf8")));
    });
  }

  test("UPDATE_GOLDEN is never set in CI", () => {
    if (process.env.CI) expect(process.env.UPDATE_GOLDEN).not.toBe("1");
  });

  test("F-13 matches F-01 on every requirement that does not need a term (ADR-015)", () => {
    const f01 = evaluate(StudentPlanSchema.parse(read("./fixtures/plans/F-01.json")), [GE], CATALOG);
    const f13 = evaluate(StudentPlanSchema.parse(read("./fixtures/plans/F-13.json")), [GE], CATALOG);

    // ADR-018: ALL of them, not most. F-13 is the default v1 record, and a
    // single unverifiable row in it is the failure the design exists to prevent.
    expect(f13).toHaveLength(f01.length);
    for (const before of f01) {
      const after = f13.find((r) => r.requirementId === before.requirementId)!;
      expect(after.status, `${before.requirementId} should not need a term or a grade`).toBe(before.status);
    }
  });

  test("evaluating a fixture twice is byte-identical", () => {
    const plan: StudentPlan = StudentPlanSchema.parse(read("./fixtures/plans/F-01.json"));
    expect(JSON.stringify(evaluate(plan, [GE], CATALOG))).toBe(JSON.stringify(evaluate(plan, [GE], CATALOG)));
  });

  test("shuffling the record leaves the result unchanged", () => {
    const plan: StudentPlan = StudentPlanSchema.parse(read("./fixtures/plans/F-01.json"));
    const shuffled: StudentPlan = { ...plan, completed: [...plan.completed].reverse() };
    expect(evaluate(shuffled, [GE], CATALOG)).toEqual(evaluate(plan, [GE], CATALOG));
  });
});
