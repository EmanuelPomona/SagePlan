import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { CatalogArtefactSchema, ProgramSchema } from "@gradguide/shared";
import type { Course, Program, Result } from "@gradguide/shared";
import { settleBounded } from "../src/bounded.ts";
import { buildContext, withMode } from "../src/context.ts";
import { evaluate } from "../src/index.ts";
import { eligibleCourses, settleAttribute } from "../src/rules/attribute.ts";
import { completed, grant, planWith, term } from "./helpers.ts";

const read = (rel: string) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));
const GE: Program = ProgramSchema.parse(read("../../../data/programs/general-education-2026.json"));
const CATALOG: Course[] = CatalogArtefactSchema.parse(read("./fixtures/catalog.fixture.json")).courses;
const by = (rs: Result[], id: string) => rs.find((r) => r.requirementId === id)!;

const pe = (key: string, t: ReturnType<typeof term> | null) =>
  completed(key, { term: t, grade: null, gradeMode: null });

describe("distinctTerms under unknown terms (docs/API.md 2.7)", () => {
  test("two PE courses with no recorded terms are unverifiable, naming both courses", () => {
    const plan = planWith({ matriculationTerm: null, completed: [pe("PE 001 PO", null), pe("PE 002 PO", null)] });
    const result = by(evaluate(plan, [GE], CATALOG), "physical-education");

    expect(result.status).toBe("unverifiable");
    expect(result.note).toContain("PE 001 PO");
    expect(result.note).toContain("PE 002 PO");
    expect(result.note).toMatch(/term/i);
  });

  test("the same two courses WITH distinct terms are satisfied, no unverifiable", () => {
    const plan = planWith({
      matriculationTerm: term("FA2025"),
      completed: [pe("PE 001 PO", term("FA2025")), pe("PE 002 PO", term("SP2026"))],
    });
    expect(by(evaluate(plan, [GE], CATALOG), "physical-education").status).toBe("satisfied");
  });

  test("the same two courses in the SAME term are partial, not unverifiable: nothing is unknown", () => {
    const plan = planWith({
      matriculationTerm: term("FA2025"),
      completed: [pe("PE 001 PO", term("FA2025")), pe("PE 002 PO", term("FA2025"))],
    });
    expect(by(evaluate(plan, [GE], CATALOG), "physical-education").status).toBe("partial");
  });

  test("one PE course with an unknown term is partial: both passes agree it is 1 of 2", () => {
    const plan = planWith({ matriculationTerm: null, completed: [pe("PE 001 PO", null)] });
    expect(by(evaluate(plan, [GE], CATALOG), "physical-education").status).toBe("partial");
  });
});

describe("what an unknown term actually costs, measured", () => {
  const twenty = Array.from({ length: 20 }, (_, i) =>
    completed(`FILL ${String(i + 1).padStart(3, "0")} PO`, { term: null, grade: null, gradeMode: null, credits: 1 }),
  );

  test("rules with no term dependency are unaffected: total-credits answers the same", () => {
    const unknown = planWith({ matriculationTerm: null, completed: twenty });
    const known = planWith({
      matriculationTerm: term("FA2025"),
      completed: twenty.map((c) => ({ ...c, term: term("FA2025") })),
    });

    expect(by(evaluate(unknown, [GE], CATALOG), "total-credits").status)
      .toBe(by(evaluate(known, [GE], CATALOG), "total-credits").status);
  });

  test("WITH exam credit and no terms, the post-matriculation rule goes unverifiable", () => {
    const plan = planWith({
      matriculationTerm: null,
      completed: twenty,
      externalCredits: [grant("ap-biology", "AP Biology", [], 1, "biology")],
    });
    const result = by(evaluate(plan, [GE], CATALOG), "post-matriculation-credits");

    expect(result.status).toBe("unverifiable");
    expect(result.note).toMatch(/term/i);
  });

  /**
   * MEASURED, and the subject of a CONTRACT CHANGE REQUEST in
   * docs/handoffs/agent-frontend.md.
   *
   * docs/API.md 2.7 says "with no external or transfer credit, including or
   * excluding unknown-term courses gives the same answer for every credit rule,
   * so nothing goes unverifiable". Implemented literally, that is not what
   * happens: `sinceMatriculation` reads EVERY unknown term as mode-dependent, so
   * a plain 20-course Pomona record with no terms and no outside credit still
   * goes unverifiable. That record is the DEFAULT under ADR-015.
   *
   * This test pins the behaviour the contract currently specifies so the
   * divergence is visible rather than silent. It should be rewritten when the
   * manager rules.
   */
  test("but a plain record with no outside credit ALSO goes unverifiable, which 2.7 says it should not", () => {
    const plan = planWith({ matriculationTerm: null, completed: twenty });
    expect(by(evaluate(plan, [GE], CATALOG), "post-matriculation-credits").status).toBe("unverifiable");
  });
});

describe("bounded evaluation never throws and stays deterministic", () => {
  test("a plan with every field null produces a full result set", () => {
    const plan = planWith({
      matriculationTerm: null,
      completed: [completed("HIST 101 PO", { term: null, grade: null, gradeMode: null })],
    });
    expect(() => evaluate(plan, [GE], CATALOG)).not.toThrow();
    expect(evaluate(plan, [GE], CATALOG)).toHaveLength(GE.requirements.length);
  });

  test("two runs over an unknown-heavy plan are byte identical", () => {
    const plan = planWith({ matriculationTerm: null, completed: [pe("PE 001 PO", null), pe("PE 002 PO", null)] });
    expect(JSON.stringify(evaluate(plan, [GE], CATALOG))).toBe(JSON.stringify(evaluate(plan, [GE], CATALOG)));
  });
});

describe("the pessimistic pass is load-bearing, not decoration", () => {
  /**
   * A test that only records outcomes where the two passes AGREE cannot tell a
   * working implementation from one that never runs the pessimistic pass at
   * all, and "silently assuming in the student's favour" is the exact failure
   * this mechanism exists to prevent.
   *
   * So neutralise it: feed settleBounded a settle function that returns the
   * OPTIMISTIC answer whichever pass asks, and assert the outcome changes. If
   * it does not change, the mechanism is vestigial.
   */
  const rule = { kind: "attribute", attr: "PHYSICAL_EDUCATION", n: 2, distinctTerms: true } as const;

  function settlements() {
    const plan = planWith({ matriculationTerm: null, completed: [pe("PE 001 PO", null), pe("PE 002 PO", null)] });
    const ctx = buildContext(plan, CATALOG);
    const eligible = eligibleCourses(rule, ctx);

    const real = settleBounded((pass) => settleAttribute(rule, eligible, pass, new Set(), eligible), ctx, eligible);

    // The pessimistic pass, neutralised: every pass answers optimistically.
    const optimisticOnly = withMode(ctx, "optimistic");
    const neutralised = settleBounded(
      () => settleAttribute(rule, eligible, optimisticOnly, new Set(), eligible),
      ctx,
      eligible,
    );

    return { real, neutralised };
  }

  test("with the pessimistic pass neutralised the row claims SATISFIED", () => {
    expect(settlements().neutralised.status).toBe("satisfied");
  });

  test("with it running the row is unverifiable instead, so the pass changes the answer", () => {
    const { real, neutralised } = settlements();

    expect(real.status).toBe("unverifiable");
    expect(real.status).not.toBe(neutralised.status);
  });

  test("and the difference is exactly the claim a student would have been given wrongly", () => {
    const { real } = settlements();
    expect(real.satisfiedBy).toEqual([]);
    expect(real.note).toMatch(/PE 001 PO/);
  });
});

describe("null terms must not crash the overlap check", () => {
  /**
   * The round-1 fix for C-1 compares two entries of the same course by term, to
   * stop a duplicated row closing two exclusive requirements at once. `term` is
   * nullable now, and `sameTerm` is not null-safe, so a duplicated row with no
   * recorded term threw. The 176-test suite missed it; a performance probe over
   * a real plan with every term removed found it.
   */
  test("the same course listed twice with no terms does not throw", () => {
    const plan = planWith({
      matriculationTerm: null,
      completed: [
        completed("HIST 101 PO", { term: null, grade: null, gradeMode: null }),
        completed("HIST 101 PO", { term: null, grade: null, gradeMode: null }),
      ],
    });
    expect(() => evaluate(plan, [GE], CATALOG)).not.toThrow();
  });

  test("and it still cannot close two requirements at once (C-1 stays fixed)", () => {
    const plan = planWith({
      matriculationTerm: null,
      completed: [
        completed("PHIL 032 PO", { term: null, grade: null, gradeMode: null }),
        completed("PHIL 032 PO", { term: null, grade: null, gradeMode: null }),
      ],
    });
    const rs = evaluate(plan, [GE], CATALOG);
    // writing-intensive and speaking-intensive are denyOnly against each other.
    const wi = by(rs, "writing-intensive").satisfiedBy.length;
    const si = by(rs, "speaking-intensive").satisfiedBy.length;
    expect(wi + si).toBe(1);
  });
});
