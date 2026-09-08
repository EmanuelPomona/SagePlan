import { describe, expect, test } from "vitest";
import { PLAN_SCHEMA_VERSION, emptyPlan } from "@gradguide/shared";
import { migratePlan } from "../plan/migratePlan.ts";

const valid = () => emptyPlan("2026-2027", { year: 2025, term: "FA" }, "firstYear");

describe("migratePlan", () => {
  test("a current plan passes through unchanged", () => {
    const plan = valid();
    const out = migratePlan(plan);

    expect(out.ok).toBe(true);
    if (out.ok) expect(out.plan).toEqual(plan);
  });

  test("a plan from a NEWER version is refused, never silently downgraded", () => {
    const out = migratePlan({ ...valid(), schemaVersion: PLAN_SCHEMA_VERSION + 1 });

    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe("newer");
      expect(out.detail).toMatch(/newer/i);
    }
  });

  test("garbage is invalid with a specific reason, not a crash", () => {
    for (const junk of ["", "not json", 42, null, undefined, [], { hello: "world" }]) {
      const out = migratePlan(junk);
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.reason).toBe("invalid");
    }
  });

  test("a plan with a broken field names the field that broke", () => {
    const out = migratePlan({ ...valid(), matriculationTerm: { year: "nineteen", term: "FA" } });

    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe("invalid");
      expect(out.detail).toContain("matriculationTerm");
    }
  });

  test("every engine fixture plan round-trips", async () => {
    const fixtures = import.meta.glob("../../../../packages/engine/test/fixtures/plans/*.json", { eager: true });
    const names = Object.keys(fixtures);

    expect(names.length).toBeGreaterThan(10);
    for (const name of names) {
      const raw = (fixtures[name] as { default: unknown }).default;
      const out = migratePlan(raw);
      expect(out.ok, `${name} should migrate`).toBe(true);
    }
  });
});
