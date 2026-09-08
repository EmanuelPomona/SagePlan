import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { CatalogArtefactSchema, ProgramSchema, StudentPlanSchema, courseKey } from "@gradguide/shared";
import type { Course, Program, Result } from "@gradguide/shared";
import { buildContext } from "../src/context.ts";
import { evaluate } from "../src/index.ts";
import { eligibleCourses } from "../src/rules/attribute.ts";
import { completed, grant, planWith, term } from "./helpers.ts";

const at = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const read = (rel: string) => JSON.parse(readFileSync(at(rel), "utf8"));
const GE: Program = ProgramSchema.parse(read("../../../data/programs/general-education-2026.json"));
const CATALOG: Course[] = CatalogArtefactSchema.parse(read("./fixtures/catalog.fixture.json")).courses;
const byId = (rs: Result[], id: string) => rs.find((r) => r.requirementId === id)!;

describe("F-11 — partial progress must survive the assignment tie-break", () => {
  test("two PE courses in one term report partial 1 of 2, not unmet", () => {
    const plan = StudentPlanSchema.parse(read("./fixtures/plans/F-11.json"));
    const pe = byId(evaluate(plan, [GE], CATALOG), "physical-education");

    expect(pe.status).toBe("partial");
    expect(pe.remaining).toEqual({ n: 1, unit: "courses" });
    expect(pe.satisfiedBy.map(courseKey)).toEqual(["PE 001 PO"]);
    expect(pe.note).toMatch(/different semesters/i);
  });

  test("a single PE course is partial rather than unmet", () => {
    const plan = planWith({ completed: [completed("PE 001 PO", { term: term("FA2025"), grade: "CR" })] });
    const pe = byId(evaluate(plan, [GE], CATALOG), "physical-education");

    expect(pe.status).toBe("partial");
    expect(pe.satisfiedBy.map(courseKey)).toEqual(["PE 001 PO"]);
  });
});

describe("the bounded-search note is not applied to ordinary plans", () => {
  test("a full 20-course record produces no 'assignment search bounded' note anywhere", () => {
    const plan = StudentPlanSchema.parse(read("./fixtures/plans/F-01.json"));

    for (const r of evaluate(plan, [GE], CATALOG)) {
      expect(r.note ?? "").not.toMatch(/assignment search bounded/);
    }
  });

  test("aggregate rows never carry an assignment note", () => {
    const plan = StudentPlanSchema.parse(read("./fixtures/plans/F-01.json"));
    const results = evaluate(plan, [GE], CATALOG);

    expect(byId(results, "gpa").note ?? "").not.toMatch(/assignment/);
    expect(byId(results, "total-credits").note ?? "").not.toMatch(/assignment/);
  });
});

describe("exam grants are distinct from one another", () => {
  test("two exams granting the same attribute stay separate courses internally", () => {
    // They all REPORT as EXAM 000 EXT. Before this was fixed they also shared
    // an internal key, so one grant could block another during assignment.
    const ctx = buildContext(
      planWith({
        externalCredits: [
          grant("ap-spanish-language", "AP Spanish Language", ["LANGUAGE"], 1, "spanish-language"),
          grant("ap-french-language", "AP French Language", ["LANGUAGE"], 1, "french-language"),
        ],
      }),
      CATALOG,
    );
    const eligible = eligibleCourses({ kind: "attribute", attr: "LANGUAGE", n: 1 }, ctx);

    expect(eligible).toHaveLength(2);
    expect(new Set(eligible.map((c) => c.key)).size).toBe(2);
    expect(eligible.every((c) => courseKey(c.completed.course) === "EXAM 000 EXT")).toBe(true);
  });

  test("exam credit still cannot satisfy a Breadth area, which admits only Claremont work", () => {
    const plan = planWith({
      externalCredits: [grant("ap-art-history", "AP Art History", ["AREA_1"], 1, "art-history")],
    });
    expect(byId(evaluate(plan, [GE], CATALOG), "area-1").status).toBe("unmet");
  });
});
