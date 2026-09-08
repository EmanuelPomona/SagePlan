import { describe, expect, test } from "vitest";
import { courseKey } from "@gradguide/shared";
import type { Rule } from "@gradguide/shared";
import { buildContext } from "../../src/context.ts";
import { settleAttested } from "../../src/rules/attested.ts";
import { eligibleForCourseRule, settleCourse } from "../../src/rules/course.ts";
import { settleDeferred } from "../../src/rules/deferred.ts";
import { settleGpa } from "../../src/rules/gpa.ts";
import { catalogCourse, completed, planWith } from "../helpers.ts";

describe("gpa rule", () => {
  const gpa = (min = 2.0): Extract<Rule, { kind: "gpa" }> => ({ kind: "gpa", min, scope: "overall" });

  test("weights grade points by credits: A (1cr) and C (1cr) average to 3.0", () => {
    const ctx = buildContext(
      planWith({
        completed: [completed("CSCI 001 PO", { grade: "A", credits: 1 }), completed("CSCI 002 PO", { grade: "C", credits: 1 })],
      }),
      [],
    );
    const s = settleGpa(gpa(2.0), ctx);

    expect(s.status).toBe("satisfied");
    expect(s.note).toMatch(/3\.0/);
  });

  test("a heavier course pulls the average toward its grade", () => {
    // A (0.5cr) + C (1cr) = (4*0.5 + 2*1) / 1.5 = 2.67
    const ctx = buildContext(
      planWith({
        completed: [completed("MUS 060 PO", { grade: "A", credits: 0.5 }), completed("CSCI 002 PO", { grade: "C", credits: 1 })],
      }),
      [],
    );
    expect(settleGpa(gpa(2.0), ctx).note).toMatch(/2\.67/);
  });

  test("falls below the minimum and is unmet", () => {
    const ctx = buildContext(planWith({ completed: [completed("CSCI 001 PO", { grade: "D", credits: 1 })] }), []);
    expect(settleGpa(gpa(2.0), ctx).status).toBe("unmet");
  });

  test("CR grades are excluded from the average", () => {
    const ctx = buildContext(
      planWith({
        completed: [
          completed("CSCI 001 PO", { grade: "A", credits: 1 }),
          completed("ID 001 PO", { grade: "CR", gradeMode: "creditNoCredit", credits: 1 }),
        ],
      }),
      [],
    );
    expect(settleGpa(gpa(2.0), ctx).note).toMatch(/4\.0/);
  });

  test("transfer grades are excluded from the average", () => {
    const ctx = buildContext(
      planWith({
        completed: [
          completed("CSCI 001 PO", { grade: "A", credits: 1 }),
          completed("TRAN 001 EXT", { grade: "D", credits: 1, provenance: "transfer" }),
        ],
      }),
      [],
    );
    expect(settleGpa(gpa(2.0), ctx).note).toMatch(/4\.0/);
  });

  test("no letter grades at all is unverifiable, never a zero GPA (F-12)", () => {
    const ctx = buildContext(
      planWith({ completed: [completed("ID 001 PO", { grade: "CR", gradeMode: "creditNoCredit" })] }),
      [],
    );
    const s = settleGpa(gpa(2.0), ctx);

    expect(s.status).toBe("unverifiable");
    expect(s.remaining).toBeNull();
    expect(s.note).toMatch(/no letter/i);
  });

  test("an F counts in the average as zero points", () => {
    // A (1cr) + F (1cr) = 2.0
    const ctx = buildContext(
      planWith({
        completed: [completed("CSCI 001 PO", { grade: "A", credits: 1 }), completed("CSCI 002 PO", { grade: "F", credits: 1 })],
      }),
      [],
    );
    expect(settleGpa(gpa(2.0), ctx).note).toMatch(/2\.0/);
  });
});

describe("course rule", () => {
  const idRule = (minGrade?: string): Extract<Rule, { kind: "course" }> => ({
    kind: "course",
    course: { department: "ID", courseNumber: 1, suffix: "", affiliation: "PO" },
    ...(minGrade ? { minGrade } : {}),
  });
  const catalog = [catalogCourse("ID 001 PO", [], 1, "Critical Inquiry")];

  test("the exact course, passed, satisfies the rule", () => {
    const ctx = buildContext(planWith({ completed: [completed("ID 001 PO", { grade: "CR" })] }), catalog);
    const s = settleCourse(idRule(), eligibleForCourseRule(idRule(), ctx), ctx);

    expect(s.status).toBe("satisfied");
    expect(s.satisfiedBy.map(courseKey)).toEqual(["ID 001 PO"]);
    expect(s.remaining).toBeNull();
  });

  test("not taken leaves it unmet and offers the course itself as the candidate", () => {
    const ctx = buildContext(planWith({ completed: [] }), catalog);
    const s = settleCourse(idRule(), [], ctx);

    expect(s.status).toBe("unmet");
    expect(s.candidates.map(courseKey)).toEqual(["ID 001 PO"]);
  });

  test("a failing grade does not satisfy it", () => {
    const ctx = buildContext(planWith({ completed: [completed("ID 001 PO", { grade: "F" })] }), catalog);
    expect(eligibleForCourseRule(idRule(), ctx)).toEqual([]);
  });

  test("minGrade is enforced on letter grades", () => {
    const ctx = buildContext(planWith({ completed: [completed("ID 001 PO", { grade: "D" })] }), catalog);
    expect(eligibleForCourseRule(idRule("C-"), ctx)).toEqual([]);

    const ok = buildContext(planWith({ completed: [completed("ID 001 PO", { grade: "B" })] }), catalog);
    expect(eligibleForCourseRule(idRule("C-"), ok)).toHaveLength(1);
  });

  test("a non-letter grade never satisfies a minGrade", () => {
    const ctx = buildContext(planWith({ completed: [completed("ID 001 PO", { grade: "CR" })] }), catalog);
    expect(eligibleForCourseRule(idRule("C-"), ctx)).toEqual([]);
  });
});

describe("attested rule", () => {
  const attested = (id: string): Extract<Rule, { kind: "attested" }> => ({
    kind: "attested",
    id,
    prompt: "Have you completed the language requirement another way?",
  });

  test("an unconfirmed attestation is unverifiable and surfaces the prompt", () => {
    const ctx = buildContext(planWith(), []);
    const s = settleAttested(attested("language-alt"), ctx);

    expect(s.status).toBe("unverifiable");
    expect(s.note).toBe("Have you completed the language requirement another way?");
  });

  test("a confirmed attestation satisfies the rule", () => {
    const ctx = buildContext(planWith({ attestations: { "language-alt": true } }), []);
    expect(settleAttested(attested("language-alt"), ctx).status).toBe("satisfied");
  });

  test("an explicitly false attestation stays unverifiable", () => {
    const ctx = buildContext(planWith({ attestations: { "language-alt": false } }), []);
    expect(settleAttested(attested("language-alt"), ctx).status).toBe("unverifiable");
  });
});

describe("deferred rule kinds", () => {
  test.each(["allOf", "anyOf", "chooseN", "fromSet", "milestone", "not"])(
    "%s returns unverifiable naming the unsupported kind, and never throws",
    (kind) => {
      const s = settleDeferred(kind);

      expect(s.status).toBe("unverifiable");
      expect(s.note).toBe(`rule kind '${kind}' not yet supported`);
      expect(s.satisfiedBy).toEqual([]);
      expect(s.remaining).toBeNull();
      expect(s.candidates).toEqual([]);
    },
  );
});
