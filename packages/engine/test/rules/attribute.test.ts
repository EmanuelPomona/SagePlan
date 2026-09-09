import { describe, expect, test } from "vitest";
import { courseKey } from "@gradguide/shared";
import type { Rule } from "@gradguide/shared";
import { buildContext } from "../../src/context.ts";
import { EXAM_PSEUDO_ID } from "../../src/externalCredit.ts";
import { eligibleCourses, settleAttribute } from "../../src/rules/attribute.ts";
import { catalogCourse, completed, grant, planWith, term } from "../helpers.ts";

const AREA_3 = (n = 1, extra: Partial<Extract<Rule, { kind: "attribute" }>> = {}) =>
  ({ kind: "attribute", attr: "AREA_3", n, ...extra }) as Extract<Rule, { kind: "attribute" }>;

const catalog = [
  catalogCourse("HIST 101 PO", ["AREA_3"]),
  catalogCourse("PHIL 032 PO", ["AREA_3", "WRITING_INTENSIVE"]),
  catalogCourse("AMST 110 PO", ["AREA_3", "ANALYZING_DIFFERENCE"]),
  catalogCourse("CSCI 051 PO", ["AREA_5"]),
];

describe("attribute rule", () => {
  test("one qualifying course satisfies n=1", () => {
    const ctx = buildContext(planWith({ completed: [completed("HIST 101 PO")] }), catalog);
    const eligible = eligibleCourses(AREA_3(), ctx);
    const s = settleAttribute(AREA_3(), eligible, ctx);

    expect(s.status).toBe("satisfied");
    expect(s.satisfiedBy.map(courseKey)).toEqual(["HIST 101 PO"]);
    expect(s.remaining).toEqual({ n: 0, unit: "courses" });
  });

  test("no qualifying course leaves the requirement unmet", () => {
    const ctx = buildContext(planWith({ completed: [completed("CSCI 051 PO")] }), catalog);
    const s = settleAttribute(AREA_3(), [], ctx);

    expect(s.status).toBe("unmet");
    expect(s.satisfiedBy).toEqual([]);
    expect(s.remaining).toEqual({ n: 1, unit: "courses" });
  });

  test("a non-passing grade does not make a course eligible", () => {
    const ctx = buildContext(
      planWith({ completed: [completed("HIST 101 PO", { grade: "F" }), completed("PHIL 032 PO", { grade: "IP" })] }),
      catalog,
    );
    expect(eligibleCourses(AREA_3(), ctx)).toEqual([]);
  });

  test("unit credits sums partial-credit courses: 0.5 + 0.5 satisfies n=1", () => {
    const half = [catalogCourse("DANC 120 PO", ["AREA_6"], 0.5), catalogCourse("MUS 060 PO", ["AREA_6"], 0.5)];
    const rule = { kind: "attribute", attr: "AREA_6", n: 1, unit: "credits" } as Extract<Rule, { kind: "attribute" }>;
    const ctx = buildContext(
      planWith({ completed: [completed("DANC 120 PO"), completed("MUS 060 PO")] }),
      half,
    );
    const s = settleAttribute(rule, eligibleCourses(rule, ctx), ctx);

    expect(s.status).toBe("satisfied");
    expect(s.remaining).toEqual({ n: 0, unit: "credits" });
  });

  test("unit credits short of n is partial with the credit remainder", () => {
    const half = [catalogCourse("DANC 120 PO", ["AREA_6"], 0.5)];
    const rule = { kind: "attribute", attr: "AREA_6", n: 1, unit: "credits" } as Extract<Rule, { kind: "attribute" }>;
    const ctx = buildContext(planWith({ completed: [completed("DANC 120 PO")] }), half);
    const s = settleAttribute(rule, eligibleCourses(rule, ctx), ctx);

    expect(s.status).toBe("partial");
    expect(s.remaining).toEqual({ n: 0.5, unit: "credits" });
  });

  test("distinctTerms: two PE courses in the SAME term count once (F-11)", () => {
    const pe = [catalogCourse("PE 001 PO", ["PHYSICAL_EDUCATION"], 0.25), catalogCourse("PE 002 PO", ["PHYSICAL_EDUCATION"], 0.25)];
    const rule = {
      kind: "attribute", attr: "PHYSICAL_EDUCATION", n: 2, distinctTerms: true,
    } as Extract<Rule, { kind: "attribute" }>;
    const ctx = buildContext(
      planWith({
        completed: [completed("PE 001 PO", { term: term("FA2025") }), completed("PE 002 PO", { term: term("FA2025") })],
      }),
      pe,
    );
    const s = settleAttribute(rule, eligibleCourses(rule, ctx), ctx);

    expect(s.status).toBe("partial");
    expect(s.remaining).toEqual({ n: 1, unit: "courses" });
    expect(s.note).toMatch(/different semesters/i);
  });

  test("distinctTerms: two PE courses in DIFFERENT terms satisfy n=2", () => {
    const pe = [catalogCourse("PE 001 PO", ["PHYSICAL_EDUCATION"], 0.25), catalogCourse("PE 002 PO", ["PHYSICAL_EDUCATION"], 0.25)];
    const rule = {
      kind: "attribute", attr: "PHYSICAL_EDUCATION", n: 2, distinctTerms: true,
    } as Extract<Rule, { kind: "attribute" }>;
    const ctx = buildContext(
      planWith({
        completed: [completed("PE 001 PO", { term: term("FA2025") }), completed("PE 002 PO", { term: term("SP2026") })],
      }),
      pe,
    );
    const s = settleAttribute(rule, eligibleCourses(rule, ctx), ctx);

    expect(s.status).toBe("satisfied");
  });

  test("a granted LANGUAGE attribute from an exam satisfies the rule via the EXAM pseudo-id", () => {
    const rule = { kind: "attribute", attr: "LANGUAGE", n: 1 } as Extract<Rule, { kind: "attribute" }>;
    const ctx = buildContext(
      planWith({ externalCredits: [grant("ap-spanish-language", "AP Spanish Language", ["LANGUAGE"], 1)] }),
      catalog,
    );
    const s = settleAttribute(rule, eligibleCourses(rule, ctx), ctx);

    expect(s.status).toBe("satisfied");
    expect(s.satisfiedBy).toEqual([EXAM_PSEUDO_ID]);
    expect(courseKey(EXAM_PSEUDO_ID)).toBe("EXAM 000 EXT");
    expect(s.note).toContain("AP Spanish Language");
  });

  test("a non-qualifying exam grants nothing", () => {
    const rule = { kind: "attribute", attr: "LANGUAGE", n: 1 } as Extract<Rule, { kind: "attribute" }>;
    const ctx = buildContext(
      planWith({ externalCredits: [grant("ap-french-language", "AP French Language", [], 0)] }),
      catalog,
    );
    expect(eligibleCourses(rule, ctx)).toEqual([]);
  });

  test("external grants never count under a sinceMatriculation filter", () => {
    const rule = {
      kind: "attribute", attr: "LANGUAGE", n: 1, filter: { sinceMatriculation: true },
    } as Extract<Rule, { kind: "attribute" }>;
    const ctx = buildContext(
      planWith({ externalCredits: [grant("ap-spanish-language", "AP Spanish Language", ["LANGUAGE"], 1)] }),
      catalog,
    );
    expect(eligibleCourses(rule, ctx)).toEqual([]);
  });

  test("candidates exclude courses already on the record and are sorted by course key", () => {
    // n=2 so one completed AREA_3 course leaves the requirement partial and
    // candidates still meaningful. PHIL 032 is on the record, so it must not
    // be offered back as a candidate.
    const rule = AREA_3(2);
    const ctx = buildContext(planWith({ completed: [completed("PHIL 032 PO")] }), catalog);
    const s = settleAttribute(rule, eligibleCourses(rule, ctx), ctx);

    expect(s.status).toBe("partial");
    expect(s.candidates.map(courseKey)).toEqual(["AMST 110 PO", "HIST 101 PO"]);
  });

  test("candidates are empty once the requirement is satisfied", () => {
    const ctx = buildContext(planWith({ completed: [completed("HIST 101 PO")] }), catalog);
    const s = settleAttribute(AREA_3(), eligibleCourses(AREA_3(), ctx), ctx);

    expect(s.candidates).toEqual([]);
  });
});
