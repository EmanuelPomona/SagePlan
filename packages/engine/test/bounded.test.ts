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

describe("ADR-018 — the pessimistic pass may only consider values the field could take", () => {
  const twenty = Array.from({ length: 20 }, (_, i) =>
    completed(`FILL ${String(i + 1).padStart(3, "0")} PO`, { term: null, grade: null, gradeMode: null, credits: 1 }),
  );

  test("a plain record with no terms produces NO unverifiable row at all", () => {
    // The whole point of ADR-015 and ADR-018. Pre-matriculation college work is
    // posted as advanced standing or transfer credit, so unmarked Pomona
    // coursework cannot predate matriculation and both passes agree about it.
    const plan = planWith({ matriculationTerm: null, completed: twenty });
    const unverifiable = evaluate(plan, [GE], CATALOG).filter((r) => r.status === "unverifiable");

    expect(unverifiable.map((r) => r.requirementId)).toEqual([]);
  });

  test("exam credit does NOT change that: includeExternal is false, so it never enters the sum", () => {
    // The discriminator this test used to assert was unsatisfiable, which is
    // what the contract change request established (ADR-018).
    const plan = planWith({
      matriculationTerm: null,
      completed: twenty,
      externalCredits: [grant("ap-biology", "AP Biology", [], 1, "biology")],
    });
    expect(by(evaluate(plan, [GE], CATALOG), "post-matriculation-credits").status).not.toBe("unverifiable");
  });

  test("a TRANSFER course with no term does, and the note names only that course", () => {
    // 29 credits of Pomona work plus one transfer credit, so the two passes
    // straddle the 30-credit threshold and genuinely disagree.
    const pomona = Array.from({ length: 29 }, (_, i) =>
      completed(`FILL ${String(i + 1).padStart(3, "0")} PO`, { term: null, grade: null, gradeMode: null, credits: 1 }),
    );
    const plan = planWith({
      matriculationTerm: null,
      completed: [
        ...pomona,
        completed("ECON 101 EXT", { term: null, grade: null, gradeMode: null, credits: 1, provenance: "transfer", title: "Microeconomics" }),
      ],
    });
    const result = by(evaluate(plan, [GE], CATALOG), "post-matriculation-credits");

    expect(result.status).toBe("unverifiable");
    expect(result.note).toContain("ECON 101 EXT");
    // Discriminates rather than suppresses: the 29 Pomona courses are not named.
    expect(result.note).not.toContain("FILL");
  });

  test("rules with no term dependency are unaffected either way", () => {
    const unknown = planWith({ matriculationTerm: null, completed: twenty });
    const known = planWith({
      matriculationTerm: term("FA2025"),
      completed: twenty.map((c) => ({ ...c, term: term("FA2025") })),
    });
    expect(by(evaluate(unknown, [GE], CATALOG), "total-credits").status)
      .toBe(by(evaluate(known, [GE], CATALOG), "total-credits").status);
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
