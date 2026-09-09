import { describe, expect, test } from "vitest";
import { buildContext } from "../src/context.ts";
import { courseMatchesFilter } from "../src/filters.ts";
import { completed, planWith, resolved, term } from "./helpers.ts";

const ctxFor = (plan = planWith()) => buildContext(plan, []);

describe("courseMatchesFilter", () => {
  test("an absent filter matches every course", () => {
    const c = resolved(completed("CSCI 051 PO", { provenance: "transfer" }));
    expect(courseMatchesFilter(c, undefined, ctxFor())).toBe(true);
  });

  test("provenance: only listed provenances count", () => {
    const ctx = ctxFor();
    const pomona = resolved(completed("CSCI 051 PO", { provenance: "pomona" }));
    const transfer = resolved(completed("HIST 101 PO", { provenance: "transfer" }));
    const filter = { provenance: ["pomona", "claremont"] as const };

    expect(courseMatchesFilter(pomona, { provenance: [...filter.provenance] }, ctx)).toBe(true);
    expect(courseMatchesFilter(transfer, { provenance: [...filter.provenance] }, ctx)).toBe(false);
  });

  test("transferPolicy lets a pre-matriculation transfer course through only for transfer students", () => {
    const filter = {
      provenance: ["pomona", "claremont"] as ("pomona" | "claremont")[],
      transferPolicy: "transferStudentsPreMatriculation" as const,
    };
    const preMatric = resolved(completed("HIST 101 PO", { provenance: "transfer", term: term("FA2024") }));

    const transferStudent = buildContext(
      planWith({ studentType: "transfer", matriculationTerm: term("FA2025") }),
      [],
    );
    const firstYearStudent = buildContext(
      planWith({ studentType: "firstYear", matriculationTerm: term("FA2025") }),
      [],
    );

    expect(courseMatchesFilter(preMatric, filter, transferStudent)).toBe(true);
    expect(courseMatchesFilter(preMatric, filter, firstYearStudent)).toBe(false);
  });

  test("transferPolicy does not admit a transfer course taken after matriculation", () => {
    const filter = {
      provenance: ["pomona", "claremont"] as ("pomona" | "claremont")[],
      transferPolicy: "transferStudentsPreMatriculation" as const,
    };
    const postMatric = resolved(completed("HIST 101 PO", { provenance: "transfer", term: term("SP2026") }));
    const ctx = buildContext(planWith({ studentType: "transfer", matriculationTerm: term("FA2025") }), []);

    expect(courseMatchesFilter(postMatric, filter, ctx)).toBe(false);
  });

  test("sinceMatriculation excludes courses taken before matriculation", () => {
    const ctx = buildContext(planWith({ matriculationTerm: term("FA2025") }), []);
    const before = resolved(completed("HIST 101 PO", { term: term("SP2025") }));
    const on = resolved(completed("HIST 102 PO", { term: term("FA2025") }));

    expect(courseMatchesFilter(before, { sinceMatriculation: true }, ctx)).toBe(false);
    expect(courseMatchesFilter(on, { sinceMatriculation: true }, ctx)).toBe(true);
  });

  test("partialCredit exclude drops courses worth less than one credit", () => {
    const ctx = ctxFor();
    const half = resolved(completed("MUS 060 PO", { credits: 0.25 }));
    const full = resolved(completed("CSCI 051 PO", { credits: 1 }));

    expect(courseMatchesFilter(half, { partialCredit: "exclude" }, ctx)).toBe(false);
    expect(courseMatchesFilter(full, { partialCredit: "exclude" }, ctx)).toBe(true);
    expect(courseMatchesFilter(half, { partialCredit: "include" }, ctx)).toBe(true);
  });

  test("attributes requires ALL listed attributes, not any", () => {
    const ctx = ctxFor();
    const both = resolved(completed("PHIL 032 PO", { attributes: ["AREA_3", "WRITING_INTENSIVE"] }));
    const one = resolved(completed("HIST 101 PO", { attributes: ["AREA_3"] }));
    const filter = { attributes: ["AREA_3", "WRITING_INTENSIVE"] as ("AREA_3" | "WRITING_INTENSIVE")[] };

    expect(courseMatchesFilter(both, filter, ctx)).toBe(true);
    expect(courseMatchesFilter(one, filter, ctx)).toBe(false);
  });

  test("minTerm excludes earlier terms and includes the term itself", () => {
    const ctx = ctxFor();
    const early = resolved(completed("HIST 101 PO", { term: term("FA2024") }));
    const exact = resolved(completed("HIST 102 PO", { term: term("SP2025") }));

    expect(courseMatchesFilter(early, { minTerm: term("SP2025") }, ctx)).toBe(false);
    expect(courseMatchesFilter(exact, { minTerm: term("SP2025") }, ctx)).toBe(true);
  });

  test("present fields are ANDed: passing provenance but failing partialCredit does not match", () => {
    const ctx = ctxFor();
    const c = resolved(completed("PE 001 PO", { provenance: "pomona", credits: 0.25 }));

    expect(courseMatchesFilter(c, { provenance: ["pomona"], partialCredit: "exclude" }, ctx)).toBe(false);
  });
});
