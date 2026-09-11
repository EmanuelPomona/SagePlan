import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { CatalogArtefactSchema, ProgramSchema, StudentPlanSchema, courseKey } from "@gradguide/shared";
import type { Course, Program, Result, Rule } from "@gradguide/shared";
import { buildContext } from "../src/context.ts";
import { evaluate } from "../src/index.ts";
import { eligibleCourses } from "../src/rules/attribute.ts";
import { attributeRule, catalogCourse, completed, grant, planWith, program, requirement, term } from "./helpers.ts";

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

    expect(byId(results, "total-credits").note ?? "").not.toMatch(/assignment/);
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

describe("C-1 — overlap must not be bypassed by a duplicated course row", () => {
  test("two exclusive requirements cannot both be closed by one duplicated course", () => {
    // Two identical CompletedCourse entries are DISTINCT objects with equal
    // values. Comparing their TermId by reference let the overlap check skip
    // them, and both exclusive requirements took the same course.
    const reqs = [
      requirement("x-one", attributeRule("AREA_1"), { kind: "exclusive" }),
      requirement("y-two", attributeRule("AREA_1"), { kind: "exclusive" }),
    ];
    const prog = program("dup-test", reqs);
    const catalog = [catalogCourse("DANC 051 PO", ["AREA_1"])];
    const twice = planWith({
      completed: [completed("DANC 051 PO", { term: term("FA2025") }), completed("DANC 051 PO", { term: term("FA2025") })],
    });

    const results = evaluate(twice, [prog], catalog);
    const satisfied = results.filter((r) => r.status === "satisfied");

    expect(satisfied).toHaveLength(1);
  });

  test("the same plan with a single row behaves identically", () => {
    const reqs = [
      requirement("x-one", attributeRule("AREA_1"), { kind: "exclusive" }),
      requirement("y-two", attributeRule("AREA_1"), { kind: "exclusive" }),
    ];
    const prog = program("dup-test", reqs);
    const catalog = [catalogCourse("DANC 051 PO", ["AREA_1"])];
    const once = planWith({ completed: [completed("DANC 051 PO", { term: term("FA2025") })] });

    expect(evaluate(once, [prog], catalog).filter((r) => r.status === "satisfied")).toHaveLength(1);
  });
});

describe("C-2 — the greedy short-circuit must not overstate what is still owed", () => {
  test("Area 6 reports the smallest reachable remainder, not the one greedy happened to leave", () => {
    // DANC 051 and MUS 081 both carry Area 1; MUS 081 also carries WI, and
    // ENGL 010 can cover WI instead. Spending MUS 081 on Area 1 frees DANC 120
    // (0.5cr) for Area 6 instead of MUS 060 (0.25cr).
    const plan = planWith({
      completed: [
        completed("DANC 051 PO"), completed("MUS 081 PO"), completed("ENGL 010 PO"),
        completed("DANC 120 PO"), completed("MUS 060 PO"),
      ],
    });
    const area6 = evaluate(plan, [GE], CATALOG).find((r) => r.requirementId === "area-6")!;

    expect(area6.status).toBe("partial");
    expect(area6.remaining).toEqual({ n: 0.5, unit: "credits" });
  });
});

describe("I-2 — GPA must not manufacture a failing verdict from zero-credit courses", () => {
  // General education no longer has a gpa requirement (ADR-015: it is an
  // advisory now), but the RULE KIND is still implemented for P1 majors, so it
  // is exercised through a program that uses it.
  const GPA_PROGRAM = program("gpa-only", [requirement("gpa", { kind: "gpa", min: 2.0, scope: "overall" })]);

  test("a zero-credit letter-graded course does not produce NaN", () => {
    const plan = planWith({ completed: [completed("CSCI 051 PO", { grade: "A", credits: 0 })] });
    const gpa = evaluate(plan, [GPA_PROGRAM], CATALOG).find((r) => r.requirementId === "gpa")!;

    expect(gpa.note ?? "").not.toContain("NaN");
    expect(gpa.status).toBe("unverifiable");
  });

  test("zero-credit courses alongside real ones do not distort the average", () => {
    const plan = planWith({
      completed: [completed("CSCI 051 PO", { grade: "A", credits: 1 }), completed("GEOL 112 PO", { grade: "F", credits: 0 })],
    });
    const gpa = evaluate(plan, [GPA_PROGRAM], CATALOG).find((r) => r.requirementId === "gpa")!;

    expect(gpa.status).toBe("satisfied");
    expect(gpa.note).toContain("4.00");
  });
});

describe("I-1 — program-scoped GPA is not evaluated in P0", () => {
  test("scope program returns unverifiable rather than silently answering the overall GPA", () => {
    const reqs = [requirement("major-gpa", { kind: "gpa", min: 3.5, scope: "program" })];
    const plan = planWith({
      completed: [completed("CSCI 051 PO", { grade: "A" }), completed("GEOL 112 PO", { grade: "D" })],
    });
    const result = evaluate(plan, [program("m", reqs)], CATALOG)[0]!;

    expect(result.status).toBe("unverifiable");
    expect(result.note).toMatch(/program/i);
  });

  test("scope overall still evaluates normally", () => {
    const reqs = [requirement("overall-gpa", { kind: "gpa", min: 2.0, scope: "overall" })];
    const plan = planWith({ completed: [completed("CSCI 051 PO", { grade: "A" })] });

    expect(evaluate(plan, [program("m", reqs)], CATALOG)[0]!.status).toBe("satisfied");
  });
});

describe("candidates must be able to satisfy the rule they are offered for", () => {
  test("a partialCredit:exclude rule does not offer partial-credit courses as candidates", () => {
    const rule = { kind: "attribute", attr: "AREA_6", n: 1, filter: { partialCredit: "exclude" } } as Rule;
    const reqs = [requirement("area-6-full", rule)];
    const s = evaluate(planWith(), [program("p", reqs)], CATALOG)[0]!;

    // DANC 120 (0.5cr) and MUS 060 (0.25cr) can never satisfy it.
    expect(s.candidates.map(courseKey)).not.toContain("DANC 120 PO");
    expect(s.candidates.map(courseKey)).not.toContain("MUS 060 PO");
    expect(s.candidates.map(courseKey)).toContain("THEA 001 PO");
  });

  test("an attributes filter narrows candidates to courses carrying all of them", () => {
    const rule = { kind: "attribute", attr: "AREA_3", n: 1, filter: { attributes: ["WRITING_INTENSIVE"] } } as Rule;
    const reqs = [requirement("a3-wi", rule)];
    const s = evaluate(planWith(), [program("p", reqs)], CATALOG)[0]!;

    expect(s.candidates.map(courseKey)).toEqual(["PHIL 032 PO"]);
  });
});

describe("the exam note must not claim a requirement is satisfied when it is not", () => {
  test("a partial requirement helped by an exam does not say 'Satisfied by'", () => {
    const reqs = [requirement("pe-two", attributeRule("PHYSICAL_EDUCATION", 2))];
    const plan = planWith({
      externalCredits: [grant("ap-pe", "AP Physical Education", ["PHYSICAL_EDUCATION"], 1)],
    });
    const s = evaluate(plan, [program("p", reqs)], CATALOG)[0]!;

    expect(s.status).toBe("partial");
    expect(s.note ?? "").not.toMatch(/^Satisfied by/);
  });

  test("a satisfied requirement still names the exam", () => {
    const reqs = [requirement("lang", attributeRule("LANGUAGE", 1))];
    const plan = planWith({
      externalCredits: [grant("ap-spanish-language", "AP Spanish Language", ["LANGUAGE"], 1)],
    });
    const s = evaluate(plan, [program("p", reqs)], CATALOG)[0]!;

    expect(s.status).toBe("satisfied");
    expect(s.note).toContain("AP Spanish Language");
  });
});
