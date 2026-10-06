import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { ExternalCreditRulesSchema, type ExternalCreditInput, type ExternalCreditRules } from "@sageplan/shared";
import { resolveExternalCredit } from "../src/externalCredit.ts";
import { evaluate } from "../src/index.ts";
import { CatalogArtefactSchema, ProgramSchema, StudentPlanSchema } from "@sageplan/shared";
import { resolve } from "node:path";

const GE_PROGRAM = ProgramSchema.parse(
  JSON.parse(readFileSync(resolve(__dirname, "../../../data/programs/general-education-2026.json"), "utf8")),
);
const CATALOG_COURSES = CatalogArtefactSchema.parse(
  JSON.parse(readFileSync(resolve(__dirname, "fixtures/catalog.fixture.json"), "utf8")),
).courses;

/** The real, reviewed rules file — these thresholds are the product's promise. */
const RULES: ExternalCreditRules = ExternalCreditRulesSchema.parse(
  JSON.parse(readFileSync(fileURLToPath(new URL("../../../data/external-credit-rules.json", import.meta.url)), "utf8")),
);

const ap = (subjectKey: string, score: number): ExternalCreditInput => ({ kind: "AP", subjectKey, score, grade: null, level: null });
const ib = (subjectKey: string, score: number, level: "HL" | "SL"): ExternalCreditInput => ({ kind: "IB", subjectKey, score, grade: null, level });
const satii = (subjectKey: string, score: number): ExternalCreditInput => ({ kind: "SATII", subjectKey, score, grade: null, level: null });
const alevel = (subjectKey: string, grade: string): ExternalCreditInput => ({ kind: "ALEVEL", subjectKey, score: null, grade, level: null });

describe("resolveExternalCredit — F-03b threshold boundaries", () => {
  test("AP 3 does not qualify; AP 4 does", () => {
    const three = resolveExternalCredit(ap("ap-french-language", 3), RULES);
    expect(three.qualifies).toBe(false);
    expect(three.credits).toBe(0);
    expect(three.grantsAttributes).toEqual([]);

    const four = resolveExternalCredit(ap("ap-french-language", 4), RULES);
    expect(four.qualifies).toBe(true);
    expect(four.credits).toBe(1);
    expect(four.grantsAttributes).toEqual(["LANGUAGE"]);
  });

  test("IB Language B at SL 7 does NOT satisfy Language and earns no credit", () => {
    const out = resolveExternalCredit(ib("ib-spanish-b", 7, "SL"), RULES);

    expect(out.grantsAttributes).toEqual([]);
    expect(out.credits).toBe(0);
    expect(out.qualifies).toBe(false);
  });

  test("IB Language B at HL 6 satisfies Language and earns credit", () => {
    const out = resolveExternalCredit(ib("ib-spanish-b", 6, "HL"), RULES);

    expect(out.grantsAttributes).toEqual(["LANGUAGE"]);
    expect(out.credits).toBe(1);
  });

  test("IB Language A at SL 7 satisfies Language but earns no credit", () => {
    const out = resolveExternalCredit(ib("ib-spanish-a", 7, "SL"), RULES);

    expect(out.grantsAttributes).toEqual(["LANGUAGE"]);
    expect(out.credits).toBe(0);
    expect(out.qualifies).toBe(true);
  });

  test("IB Language A at SL 6 satisfies Language too: 6 is the threshold, not 7 (ADR-007, L-9)", () => {
    const out = resolveExternalCredit(ib("ib-spanish-a", 6, "SL"), RULES);

    expect(out.grantsAttributes).toEqual(["LANGUAGE"]);
    expect(out.credits).toBe(0);
  });

  test("IB Language A at SL 5 does NOT satisfy Language: the threshold bites from below", () => {
    expect(resolveExternalCredit(ib("ib-spanish-a", 5, "SL"), RULES).qualifies).toBe(false);
  });

  test("IB Standard Level never earns advanced standing credit", () => {
    const out = resolveExternalCredit(ib("ib-history", 7, "SL"), RULES);

    expect(out.credits).toBe(0);
    expect(out.notes.join(" ")).toMatch(/standard level/i);
  });

  test("IB Higher Level 6 earns credit", () => {
    expect(resolveExternalCredit(ib("ib-chemistry", 7, "HL"), RULES).credits).toBe(1);
    expect(resolveExternalCredit(ib("ib-chemistry", 6, "HL"), RULES).credits).toBe(1);
    expect(resolveExternalCredit(ib("ib-chemistry", 5, "HL"), RULES).credits).toBe(0);
  });

  test("SAT-II Chinese at 800 does not satisfy Language: it is tested in Romanized script", () => {
    const out = resolveExternalCredit(satii("satii-chinese", 800), RULES);

    expect(out.grantsAttributes).toEqual([]);
    expect(out.qualifies).toBe(false);
    expect(out.notes.join(" ")).toMatch(/romanized/i);
  });

  test("SAT-II French at 650 satisfies Language with no credit", () => {
    const out = resolveExternalCredit(satii("satii-french", 650), RULES);

    expect(out.grantsAttributes).toEqual(["LANGUAGE"]);
    expect(out.credits).toBe(0);
    expect(out.qualifies).toBe(true);
  });

  test("SAT-II French below 650 does not qualify", () => {
    expect(resolveExternalCredit(satii("satii-french", 640), RULES).qualifies).toBe(false);
  });

  test("A-Level Chinese at A earns credit but does not satisfy Language", () => {
    const out = resolveExternalCredit(alevel("alevel-chinese", "A"), RULES);

    expect(out.credits).toBe(1);
    expect(out.grantsAttributes).toEqual([]);
  });

  test("A-Level German at B satisfies Language and earns credit", () => {
    const out = resolveExternalCredit(alevel("alevel-german", "B"), RULES);

    expect(out.grantsAttributes).toEqual(["LANGUAGE"]);
    expect(out.credits).toBe(1);
  });

  test("A-Level below the minimum grade earns nothing", () => {
    expect(resolveExternalCredit(alevel("alevel-german", "C"), RULES).qualifies).toBe(false);
  });

  test("an unknown exam is reported, never thrown", () => {
    const out = resolveExternalCredit(ap("ap-underwater-basket-weaving", 5), RULES);

    expect(out.qualifies).toBe(false);
    expect(out.notes).toContain("unknown exam");
    expect(out.label).toBe("ap-underwater-basket-weaving");
  });
});

describe("resolveExternalCredit — reported fields", () => {
  test("carries the subject label, duplicateKey and the ids of the rules that fired", () => {
    const out = resolveExternalCredit(ap("ap-spanish-language", 5), RULES);

    expect(out.label).toBe("AP Spanish Language and Culture");
    expect(out.duplicateKey).toBe("spanish-language");
    expect(out.ruleIds).toEqual(["ap-advanced-standing-credit", "ap-language-requirement"]);
  });

  test("echoes the student's own input back unchanged", () => {
    const input = ib("ib-spanish-a", 7, "SL");
    const out = resolveExternalCredit(input, RULES);

    expect(out.kind).toBe("IB");
    expect(out.subjectKey).toBe("ib-spanish-a");
    expect(out.score).toBe(7);
    expect(out.level).toBe("SL");
  });

  test("AP Calculus AB and BC share a duplicateKey so the caller can drop one", () => {
    expect(resolveExternalCredit(ap("ap-calculus-ab", 5), RULES).duplicateKey).toBe("calculus");
    expect(resolveExternalCredit(ap("ap-calculus-bc", 5), RULES).duplicateKey).toBe("calculus");
  });

  test("a missing score never throws", () => {
    const out = resolveExternalCredit({ kind: "AP", subjectKey: "ap-biology", score: null, grade: null, level: null }, RULES);
    expect(out.qualifies).toBe(false);
  });
});

describe("F-03c — the ADR-007 correction is asserted by a golden that can discriminate (L-9)", () => {
  /**
   * F-03b carries five LANGUAGE-granting exams, so deleting the IB Language A
   * rule changes nothing in its golden: the clause AC-P16 cites is carried by a
   * fixture that cannot fail on it. That is the REDUNDANCY failure mode.
   *
   * F-03c isolates it. One IB Language A exam at SL 6, no language coursework,
   * no other granter. Neutralise the rule and Language must flip.
   */
  const withoutLanguageA: ExternalCreditRules = {
    ...RULES,
    rules: RULES.rules.filter((r) => r.id !== "ib-language-a-requirement"),
  };
  const examInput = { kind: "IB", subjectKey: "ib-spanish-a", score: 6, grade: null, level: "SL" } as const;

  test("with the rule in place the exam grants Language", () => {
    expect(resolveExternalCredit(examInput, RULES).grantsAttributes).toEqual(["LANGUAGE"]);
  });

  test("with the rule neutralised it grants nothing, so the fixture discriminates", () => {
    const out = resolveExternalCredit(examInput, withoutLanguageA);

    expect(out.grantsAttributes).toEqual([]);
    expect(out.qualifies).toBe(false);
  });

  test("and it is the ONLY rule that fires for this exam, so nothing else could carry it", () => {
    expect(resolveExternalCredit(examInput, RULES).ruleIds).toEqual(["ib-language-a-requirement"]);
  });

  test("END TO END: the language row flips from satisfied to unmet when the rule is neutralised", () => {
    // This is what L-9 asked for. Asserting the resolver alone would leave the
    // same hole one level down: the GOLDEN has to be the thing that cannot pass
    // with the correction removed.
    const plan = StudentPlanSchema.parse(
      JSON.parse(readFileSync(resolve(__dirname, "fixtures/plans/F-03c.json"), "utf8")),
    );
    const language = (rules: ExternalCreditRules) =>
      evaluate(
        { ...plan, externalCredits: [resolveExternalCredit(examInput, rules)] },
        [GE_PROGRAM],
        CATALOG_COURSES,
      ).find((r) => r.requirementId === "language")!.status;

    expect(language(RULES)).toBe("satisfied");
    expect(language(withoutLanguageA)).toBe("unmet");
  });
});
