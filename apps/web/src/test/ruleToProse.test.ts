import { describe, expect, test } from "vitest";
import type { Rule } from "@sageplan/shared";
import { ruleToProse } from "../audit/ruleToProse.ts";

const prose = (rule: Rule) => ruleToProse(rule);

describe("ruleToProse", () => {
  test("a named course", () => {
    expect(prose({ kind: "course", course: { department: "ID", courseNumber: 1, suffix: "", affiliation: "PO" } }))
      .toBe("Pass ID 001 PO.");
  });

  test("a named course with a minimum grade", () => {
    expect(prose({ kind: "course", course: { department: "ID", courseNumber: 1, suffix: "", affiliation: "PO" }, minGrade: "C-" }))
      .toContain("C- or better");
  });

  test("one course carrying an attribute", () => {
    expect(prose({ kind: "attribute", attr: "AREA_3", n: 1 })).toBe("One course tagged Area 3.");
  });

  test("several courses, pluralised", () => {
    expect(prose({ kind: "attribute", attr: "PHYSICAL_EDUCATION", n: 2 })).toContain("Two courses tagged PE");
  });

  test("courses from different semesters", () => {
    expect(prose({ kind: "attribute", attr: "PHYSICAL_EDUCATION", n: 2, distinctTerms: true }))
      .toContain("different semesters");
  });

  test("credits rather than courses", () => {
    expect(prose({ kind: "attribute", attr: "AREA_6", n: 1, unit: "credits" })).toContain("1 credit");
  });

  test("a provenance filter is spelled out", () => {
    const rule: Rule = { kind: "attribute", attr: "AREA_1", n: 1, filter: { provenance: ["pomona", "claremont"] } };
    expect(prose(rule)).toContain("Claremont Colleges");
  });

  test("credits with a cap on exam credit", () => {
    const rule: Rule = { kind: "credits", n: 32, caps: { advancedStandingCredits: 2 } };
    expect(prose(rule)).toBe("32 course credits, counting at most 2 from exams.");
  });

  test("credits since matriculation", () => {
    expect(prose({ kind: "credits", n: 30, filter: { sinceMatriculation: true } }))
      .toContain("after you matriculated");
  });

  test("a grade point average", () => {
    expect(prose({ kind: "gpa", min: 2, scope: "overall" }))
      .toBe("A grade point average of at least 2.00 over letter-graded courses.");
  });

  test("an attested rule surfaces its prompt", () => {
    expect(prose({ kind: "attested", id: "x", prompt: "Did you do the thing?" })).toContain("Did you do the thing?");
  });

  test.each(["allOf", "anyOf", "chooseN", "fromSet", "milestone", "not"])(
    "the deferred kind %s says so plainly instead of guessing",
    (kind) => {
      expect(prose({ kind } as unknown as Rule)).toBe(`Not checked in this version: ${kind}.`);
    },
  );

  test("never returns an empty string", () => {
    const kinds: Rule[] = [
      { kind: "course", course: { department: "ID", courseNumber: 1, suffix: "", affiliation: "PO" } },
      { kind: "attribute", attr: "AREA_1", n: 1 },
      { kind: "credits", n: 1 },
      { kind: "gpa", min: 2, scope: "overall" },
      { kind: "attested", id: "x", prompt: "y" },
    ];
    for (const rule of kinds) expect(prose(rule).length).toBeGreaterThan(0);
  });
});
