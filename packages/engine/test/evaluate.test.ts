import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { CatalogArtefactSchema, ProgramSchema, ResultSchema, courseKey } from "@sageplan/shared";
import type { Course, Program, Result } from "@sageplan/shared";
import { evaluate } from "../src/index.ts";
import { completed, planWith, program, requirement, term } from "./helpers.ts";

const read = (rel: string) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));

const GE: Program = ProgramSchema.parse(read("../../../data/programs/general-education-2026.json"));
const CATALOG: Course[] = CatalogArtefactSchema.parse(read("./fixtures/catalog.fixture.json")).courses;

const byId = (results: Result[], id: string): Result => {
  const r = results.find((x) => x.requirementId === id);
  if (!r) throw new Error(`no result for ${id}`);
  return r;
};

describe("evaluate — shape and ordering", () => {
  test("returns exactly one result per requirement, in program then requirement order", () => {
    const results = evaluate(planWith(), [GE], CATALOG);

    expect(results).toHaveLength(GE.requirements.length);
    expect(results.map((r) => r.requirementId)).toEqual(GE.requirements.map((r) => r.id));
    expect(results.every((r) => r.programId === GE.id)).toBe(true);
  });

  test("every result validates against ResultSchema", () => {
    for (const r of evaluate(planWith({ completed: [completed("HIST 101 PO")] }), [GE], CATALOG)) {
      expect(() => ResultSchema.parse(r)).not.toThrow();
    }
  });

  test("results from several programs keep program order", () => {
    const extra = program("fake-major", [requirement("m1", { kind: "attribute", attr: "AREA_5", n: 1 })]);
    const results = evaluate(planWith(), [GE, extra], CATALOG);

    expect(results).toHaveLength(GE.requirements.length + 1);
    expect(results.at(-1)?.programId).toBe("fake-major");
  });

  test("confidence falls back from the requirement to the program", () => {
    const results = evaluate(planWith(), [GE], CATALOG);

    expect(byId(results, "area-6").confidence).toBe("draft");
    expect(byId(results, "area-1").confidence).toBe("verified");
  });
});

describe("F-12 — the empty plan", () => {
  const results = evaluate(planWith(), [GE], CATALOG);

  test("nothing throws and every requirement is unmet or unverifiable", () => {
    for (const r of results) {
      expect(["unmet", "unverifiable", "satisfied"]).toContain(r.status);
      if (r.status === "satisfied") expect(r.waived).toBe(true);
    }
  });

  test("general education no longer carries a GPA requirement at all (ADR-015)", () => {
    // The 2.00 rule is now a quoted advisory, so grades never have to be asked
    // for and never travel inside a share link.
    expect(results.find((r) => r.requirementId === "gpa")).toBeUndefined();
    expect(GE.advisories?.some((a) => a.id === "gpa")).toBe(true);
  });

  test("candidates are populated so the empty state can teach the structure", () => {
    expect(byId(results, "area-3").candidates.length).toBeGreaterThan(0);
    expect(byId(results, "language").candidates.map(courseKey)).toContain("SPAN 033 PO");
  });
});

describe("waivers — appliesWhen is data, not code", () => {
  test("a transfer student has Critical Inquiry waived, not unmet (F-02)", () => {
    const results = evaluate(planWith({ studentType: "transfer" }), [GE], CATALOG);
    const ci = byId(results, "critical-inquiry");

    expect(ci.status).toBe("satisfied");
    expect(ci.waived).toBe(true);
    expect(ci.satisfiedBy).toEqual([]);
    expect(ci.note).toBeTruthy();
  });

  test("the two Physical Education requirements swap by student type", () => {
    const firstYear = evaluate(planWith({ studentType: "firstYear" }), [GE], CATALOG);
    expect(byId(firstYear, "physical-education").waived).toBeUndefined();
    expect(byId(firstYear, "physical-education-transfer").waived).toBe(true);

    const transfer = evaluate(planWith({ studentType: "transfer" }), [GE], CATALOG);
    expect(byId(transfer, "physical-education").waived).toBe(true);
    expect(byId(transfer, "physical-education-transfer").waived).toBeUndefined();
  });

  test("a waived requirement never consumes a course", () => {
    const plan = planWith({ studentType: "transfer", completed: [completed("ID 001 PO", { grade: "CR" })] });
    expect(byId(evaluate(plan, [GE], CATALOG), "critical-inquiry").satisfiedBy).toEqual([]);
  });
});

describe("F-04 — chair-granted override", () => {
  const plan = planWith({
    completed: [completed("HIST 101 PO")],
    overrides: [
      {
        requirementId: "speaking-intensive",
        course: { department: "HIST", courseNumber: 101, suffix: "", affiliation: "PO" },
        reason: "Seminar was run as a speaking-intensive section.",
        approvedBy: "Chair of History",
      },
    ],
  });

  test("the override wins over the rule and names the course", () => {
    const si = byId(evaluate(plan, [GE], CATALOG), "speaking-intensive");

    expect(si.status).toBe("satisfied");
    expect(si.viaOverride).toBe(true);
    expect(si.satisfiedBy.map(courseKey)).toEqual(["HIST 101 PO"]);
  });

  test("Area 3 may still use the overridden course, because both policies allow sharing", () => {
    // speaking-intensive is denyOnly against writing-intensive only, and area-3
    // is allowAll, so sharing IS permitted here: Area 3 may still use it.
    const a3 = byId(evaluate(plan, [GE], CATALOG), "area-3");
    expect(a3.status).toBe("satisfied");
  });

  test("an override for a requirement that does not exist is ignored, not thrown", () => {
    const odd = planWith({
      overrides: [{ requirementId: "no-such-requirement", course: { department: "HIST", courseNumber: 101, suffix: "", affiliation: "PO" }, reason: "x", approvedBy: "y" }],
    });
    expect(() => evaluate(odd, [GE], CATALOG)).not.toThrow();
  });
});

describe("attestations", () => {
  test("an attestable requirement the student confirmed is satisfied and flagged", () => {
    const plan = planWith({ attestations: { language: true } });
    const lang = byId(evaluate(plan, [GE], CATALOG), "language");

    expect(lang.status).toBe("satisfied");
    expect(lang.viaAttestation).toBe(true);
    expect(lang.note).toBeTruthy();
  });

  test("without the attestation the rule is evaluated normally", () => {
    expect(byId(evaluate(planWith(), [GE], CATALOG), "language").status).toBe("unmet");
  });
});

describe("F-07 — deferred rule kinds", () => {
  const deferredMajor = program("deferred-major", [
    requirement("choose-two", { kind: "chooseN", n: 2, unit: "courses", rules: [] }),
    requirement("thesis", { kind: "milestone", id: "thesis", label: "Senior thesis" }),
  ]);

  test("each deferred kind is unverifiable with the contract's exact note", () => {
    const results = evaluate(planWith(), [deferredMajor], CATALOG);

    expect(byId(results, "choose-two").status).toBe("unverifiable");
    expect(byId(results, "choose-two").note).toBe("rule kind 'chooseN' not yet supported");
    expect(byId(results, "thesis").note).toBe("rule kind 'milestone' not yet supported");
  });

  test("the GE results are unaffected by a deferred program alongside them", () => {
    const withDeferred = evaluate(planWith({ completed: [completed("HIST 101 PO")] }), [GE, deferredMajor], CATALOG);
    const geOnly = evaluate(planWith({ completed: [completed("HIST 101 PO")] }), [GE], CATALOG);

    expect(withDeferred.filter((r) => r.programId === GE.id)).toEqual(geOnly);
  });
});

describe("F-09 — the distinctDepartments violation is reported", () => {
  const plan = planWith({ completed: [completed("DANC 051 PO"), completed("DANC 120 PO")] });
  const results = evaluate(plan, [GE], CATALOG);
  const a1 = byId(results, "area-1");
  const a6 = byId(results, "area-6");

  test("two DANC courses cannot close both Area 1 and Area 6", () => {
    expect([a1, a6].filter((r) => r.status === "satisfied")).toHaveLength(1);
  });

  test("the blocked area SAYS WHY, naming the constraint", () => {
    const blocked = [a1, a6].find((r) => r.status !== "satisfied");

    expect(blocked?.violations).toContain("distinctDepartments");
    expect(blocked?.note).toMatch(/same department/i);
  });

  test("an area blocked for lack of courses is not blamed on the constraint", () => {
    // Area 4 is simply not taken here; it must not claim a department clash.
    const area4 = byId(results, "area-4");

    expect(area4.status).toBe("unmet");
    expect(area4.violations).toBeUndefined();
  });
});

describe("determinism (docs/API.md 2.6)", () => {
  const plan = planWith({
    completed: [completed("HIST 101 PO"), completed("CSCI 051 PO"), completed("PE 001 PO", { term: term("FA2025") })],
  });

  test("the same inputs give byte-identical output", () => {
    expect(JSON.stringify(evaluate(plan, [GE], CATALOG))).toBe(JSON.stringify(evaluate(plan, [GE], CATALOG)));
  });

  test("shuffling the student's record does not change the output", () => {
    const shuffled = planWith({ completed: [...plan.completed].reverse() });
    expect(JSON.stringify(evaluate(shuffled, [GE], CATALOG))).toBe(JSON.stringify(evaluate(plan, [GE], CATALOG)));
  });

  test("satisfiedBy and candidates are sorted by course key", () => {
    for (const r of evaluate(plan, [GE], CATALOG)) {
      expect(r.candidates.map(courseKey)).toEqual([...r.candidates.map(courseKey)].sort());
      expect(r.satisfiedBy.map(courseKey)).toEqual([...r.satisfiedBy.map(courseKey)].sort());
    }
  });
});

describe("robustness — never throws on valid input", () => {
  test("a course not in the catalog is counted from the plan's own fields", () => {
    const plan = planWith({
      completed: [completed("XXXX 999 EXT", { attributes: ["AREA_3"], credits: 1, title: "Transfer course", provenance: "transfer" })],
    });
    expect(() => evaluate(plan, [GE], CATALOG)).not.toThrow();
  });

  test("an empty catalog still produces a full result set", () => {
    expect(evaluate(planWith(), [GE], [])).toHaveLength(GE.requirements.length);
  });
});
