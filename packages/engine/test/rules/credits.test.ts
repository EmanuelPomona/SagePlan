import { describe, expect, test } from "vitest";
import type { CreditCaps, ExternalCredit, Rule } from "@sageplan/shared";
import { buildContext } from "../../src/context.ts";
import { countExternalCredits } from "../../src/externalCredit.ts";
import { settleCredits } from "../../src/rules/credits.ts";
import { catalogCourse, completed, grant, planWith, term } from "../helpers.ts";

type CreditsRule = Extract<Rule, { kind: "credits" }>;
const rule = (over: Partial<CreditsRule> = {}): CreditsRule => ({ kind: "credits", n: 32, ...over });

const GE_CAPS: CreditCaps = {
  advancedStandingCredits: 2,
  externalCredits: 16,
  partialCreditCourseCredits: 2,
  partialCreditCourses: 8,
};

/** n full-credit Pomona courses with distinct ids. */
function fullCourses(n: number, dept = "CSCI") {
  return Array.from({ length: n }, (_, i) => completed(`${dept} ${String(i + 1).padStart(3, "0")} PO`, { credits: 1 }));
}

describe("credits rule — course sums", () => {
  test("sums the credits of passing courses", () => {
    const ctx = buildContext(planWith({ completed: fullCourses(4) }), []);
    const s = settleCredits(rule({ n: 32 }), ctx);

    expect(s.status).toBe("partial");
    expect(s.remaining).toEqual({ n: 28, unit: "credits" });
  });

  test("a failed course contributes nothing", () => {
    const ctx = buildContext(
      planWith({ completed: [completed("CSCI 001 PO", { credits: 1, grade: "F" }), completed("CSCI 002 PO", { credits: 1 })] }),
      [],
    );
    expect(settleCredits(rule({ n: 32 }), ctx).remaining).toEqual({ n: 31, unit: "credits" });
  });

  test("satisfied at exactly n, and never reports negative remaining beyond it", () => {
    const ctx = buildContext(planWith({ completed: fullCourses(33) }), []);
    const s = settleCredits(rule({ n: 32 }), ctx);

    expect(s.status).toBe("satisfied");
    expect(s.remaining).toEqual({ n: 0, unit: "credits" });
  });

  test("an empty record is unmet, and credits rules never carry courses or candidates", () => {
    const ctx = buildContext(planWith(), []);
    const s = settleCredits(rule({ n: 32 }), ctx);

    expect(s.status).toBe("unmet");
    expect(s.satisfiedBy).toEqual([]);
    expect(s.candidates).toEqual([]);
  });
});

describe("credits rule — external credit inclusion", () => {
  const ap = (key: string, credits: number, dup = key): ExternalCredit => grant(key, `AP ${key}`, [], credits, dup);

  test("external credit is included by default when the rule has no filter", () => {
    const ctx = buildContext(planWith({ completed: fullCourses(2), externalCredits: [ap("ap-biology", 1)] }), []);
    expect(settleCredits(rule({ n: 32 }), ctx).remaining).toEqual({ n: 29, unit: "credits" });
  });

  test("external credit is excluded by default once the rule has a filter", () => {
    const ctx = buildContext(
      planWith({ completed: fullCourses(2), externalCredits: [ap("ap-biology", 1)] }),
      [],
    );
    const s = settleCredits(rule({ n: 32, filter: { provenance: ["pomona"] } }), ctx);

    expect(s.remaining).toEqual({ n: 30, unit: "credits" });
  });

  test("includeExternal true re-admits external credit alongside a filter", () => {
    const ctx = buildContext(
      planWith({ completed: fullCourses(2), externalCredits: [ap("ap-biology", 1)] }),
      [],
    );
    const s = settleCredits(rule({ n: 32, filter: { provenance: ["pomona"] }, includeExternal: true }), ctx);

    expect(s.remaining).toEqual({ n: 29, unit: "credits" });
  });

  test("includeExternal false excludes it even with no filter", () => {
    const ctx = buildContext(planWith({ completed: fullCourses(2), externalCredits: [ap("ap-biology", 1)] }), []);
    expect(settleCredits(rule({ n: 32, includeExternal: false }), ctx).remaining).toEqual({ n: 30, unit: "credits" });
  });
});

describe("countExternalCredits — duplicates and caps", () => {
  const exam = (key: string, credits: number, dup: string): ExternalCredit => grant(key, `Exam ${key}`, [], credits, dup);

  test("a duplicate pair earns credit once, keeping the larger award (F-03)", () => {
    const out = countExternalCredits(
      [exam("ap-calculus-ab", 1, "calculus"), exam("ap-calculus-bc", 1, "calculus")],
      GE_CAPS,
    );
    expect(out.advancedStanding).toBe(1);
    expect(out.notes.join(" ")).toMatch(/duplicate/i);
  });

  test("advanced standing is capped at two credits (F-03)", () => {
    const out = countExternalCredits(
      [exam("ap-biology", 1, "biology"), exam("ap-chemistry", 1, "chemistry"), exam("ap-physics", 1, "physics")],
      GE_CAPS,
    );
    expect(out.advancedStanding).toBe(2);
    expect(out.notes.join(" ")).toMatch(/advanced standing/i);
  });

  test("a non-qualifying exam contributes nothing", () => {
    const out = countExternalCredits([exam("ap-french-language", 0, "french-language")], GE_CAPS);
    expect(out.advancedStanding).toBe(0);
  });

  test("with no caps the raw total is returned", () => {
    const out = countExternalCredits([exam("a", 1, "a"), exam("b", 1, "b"), exam("c", 1, "c")], {});
    expect(out.advancedStanding).toBe(3);
  });
});

describe("credits rule — catalog caps", () => {
  test("partial-credit courses are capped at two credits total", () => {
    // 5 half-credit courses = 2.5 raw, capped to 2.
    const completedCourses = Array.from({ length: 5 }, (_, i) =>
      completed(`MUS 0${60 + i} PO`, { credits: 0.5 }),
    );
    const ctx = buildContext(planWith({ completed: completedCourses }), []);
    const s = settleCredits(rule({ n: 32, caps: GE_CAPS }), ctx);

    expect(s.remaining).toEqual({ n: 30, unit: "credits" });
    expect(s.note).toMatch(/partial-credit|cumulative/i);
  });

  test("partial-credit courses are capped at eight courses", () => {
    // 10 quarter-credit courses = 2.5 raw; the 8-course cap binds first at 2.
    const completedCourses = Array.from({ length: 10 }, (_, i) =>
      completed(`PE 0${String(i + 1).padStart(2, "0")} PO`, { credits: 0.25 }),
    );
    const ctx = buildContext(planWith({ completed: completedCourses }), []);
    expect(settleCredits(rule({ n: 32, caps: GE_CAPS }), ctx).remaining).toEqual({ n: 30, unit: "credits" });
  });

  test("partial-credit courses under both caps are counted in full", () => {
    const completedCourses = Array.from({ length: 3 }, (_, i) => completed(`MUS 0${60 + i} PO`, { credits: 0.5 }));
    const ctx = buildContext(planWith({ completed: completedCourses }), []);
    expect(settleCredits(rule({ n: 32, caps: GE_CAPS }), ctx).remaining).toEqual({ n: 30.5, unit: "credits" });
  });

  test("transfer coursework and advanced standing share the externalCredits cap", () => {
    const caps: CreditCaps = { advancedStandingCredits: 2, externalCredits: 3 };
    const transfer = Array.from({ length: 4 }, (_, i) =>
      completed(`TRAN 00${i + 1} EXT`, { credits: 1, provenance: "transfer" }),
    );
    const ctx = buildContext(
      planWith({
        completed: [...transfer, ...fullCourses(2, "CSCI")],
        externalCredits: [grant("ap-biology", "AP Biology", [], 1, "biology"), grant("ap-chemistry", "AP Chemistry", [], 1, "chemistry")],
      }),
      [],
    );
    // 2 Pomona + min(4 transfer + 2 advanced standing, cap 3) = 2 + 3 = 5
    const s = settleCredits(rule({ n: 32, caps }), ctx);

    expect(s.remaining).toEqual({ n: 27, unit: "credits" });
    expect(s.note).toMatch(/outside The Claremont Colleges|external/i);
  });

  test("courses taken at Pomona are never touched by the external cap", () => {
    const caps: CreditCaps = { externalCredits: 1 };
    const ctx = buildContext(planWith({ completed: fullCourses(20) }), []);
    expect(settleCredits(rule({ n: 32, caps }), ctx).remaining).toEqual({ n: 12, unit: "credits" });
  });
});

describe("credits rule — filters still apply", () => {
  test("sinceMatriculation excludes pre-matriculation work", () => {
    const ctx = buildContext(
      planWith({
        matriculationTerm: term("FA2025"),
        completed: [
          completed("CSCI 001 PO", { credits: 1, term: term("SP2025") }),
          completed("CSCI 002 PO", { credits: 1, term: term("FA2025") }),
        ],
      }),
      [catalogCourse("CSCI 001 PO"), catalogCourse("CSCI 002 PO")],
    );
    const s = settleCredits(rule({ n: 30, filter: { sinceMatriculation: true } }), ctx);

    expect(s.remaining).toEqual({ n: 29, unit: "credits" });
  });
});
