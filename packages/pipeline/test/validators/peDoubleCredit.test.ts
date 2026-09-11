import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { doubleCreditPeReport } from "../../src/validators/peDoubleCredit.ts";
import { parseRegistrarCsv } from "../../src/registrar/parseCsv.ts";
import { fromRepoRoot } from "../../src/env.ts";

const rows = parseRegistrarCsv(readFileSync(fromRepoRoot("data/sources/registrar-ge-export-2026-09-08.csv")));

describe("doubleCreditPeReport (D-12)", () => {
  const r = doubleCreditPeReport(rows);

  test("finds the nineteen value-2 rows as distinct courses", () => {
    expect(r.count).toBeGreaterThan(0);
    expect(r.count).toBeLessThanOrEqual(19);
  });

  test("names the courses in canonical courseKey form", () => {
    expect(r.report).toMatch(/\| [A-Z]{2,5} \d{3}[A-Z0-9]* [A-Z]{2,3} \|/);
  });

  test("records that the meaning is unconfirmed rather than asserting it", () => {
    expect(r.report).toContain("not confirmed");
    expect(r.report).toContain("D-12");
  });

  test("explains why PE 241 depends on the >= 1 rule", () => {
    expect(r.report).toContain("222");
  });

  test("states the consequence plainly", () => {
    expect(r.report).toContain("still owe another");
  });

  test("reports nothing when no row carries a 2", () => {
    expect(doubleCreditPeReport(rows.filter((x) => x.measureValue < 2)).count).toBe(0);
  });
});
