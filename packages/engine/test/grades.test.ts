import { describe, expect, test } from "vitest";
import { courseKey } from "@gradguide/shared";
import { buildContext } from "../src/context.ts";
import { evaluate } from "../src/index.ts";
import { catalogCourse, completed, planWith, program, requirement, attributeRule } from "./helpers.ts";

const CATALOG = [
  catalogCourse("HIST 101 PO", ["AREA_3"]),
  catalogCourse("PHIL 032 PO", ["AREA_3"]),
];
const AREA_3 = program("p", [requirement("area-3", attributeRule("AREA_3"))]);

describe("grade: null means PASSED (ADR-015)", () => {
  test("a course with no recorded grade counts", () => {
    const plan = planWith({ completed: [completed("HIST 101 PO", { grade: null, gradeMode: null })] });
    const result = evaluate(plan, [AREA_3], CATALOG)[0]!;

    expect(result.status).toBe("satisfied");
    expect(result.satisfiedBy.map(courseKey)).toEqual(["HIST 101 PO"]);
  });

  test("a recorded F still does not count: a student who failed must say so", () => {
    const plan = planWith({ completed: [completed("HIST 101 PO", { grade: "F" })] });
    expect(evaluate(plan, [AREA_3], CATALOG)[0]!.status).toBe("unmet");
  });

  test("an in-progress course still does not count", () => {
    const plan = planWith({ completed: [completed("HIST 101 PO", { grade: "IP" })] });
    expect(evaluate(plan, [AREA_3], CATALOG)[0]!.status).toBe("unmet");
  });

  test("buildContext marks a null grade as passing and records nothing as unknown-grade", () => {
    const ctx = buildContext(planWith({ completed: [completed("HIST 101 PO", { grade: null, gradeMode: null })] }), CATALOG);

    expect(ctx.passing).toHaveLength(1);
    expect(ctx.courses[0]!.letterPoints).toBeNull();
  });

  test("a null matriculation term never throws", () => {
    const plan = planWith({ matriculationTerm: null, completed: [completed("HIST 101 PO", { grade: null, term: null })] });
    expect(() => evaluate(plan, [AREA_3], CATALOG)).not.toThrow();
  });
});
