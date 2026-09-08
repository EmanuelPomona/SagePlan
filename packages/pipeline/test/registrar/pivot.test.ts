import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { parseRegistrarCsv } from "../../src/registrar/parseCsv.ts";
import { pivotRegistrar } from "../../src/registrar/pivot.ts";
import { fromRepoRoot } from "../../src/env.ts";

const fixture = pivotRegistrar(parseRegistrarCsv(readFileSync(new URL("../fixtures/registrar-sample.csv", import.meta.url))));

describe("pivotRegistrar (fixture)", () => {
  test("collapses the long format to one entry per course", () => {
    expect(fixture.byCourse.size).toBe(40);
  });

  test("takes the area from the Breadth Area column", () => {
    const anyArea = [...fixture.byCourse.values()].find((e) => [...e.attributes].some((a) => a.startsWith("AREA_")));
    expect(anyArea).toBeDefined();
  });

  test("gives THEA 085 PO two areas", () => {
    const e = fixture.byCourse.get("THEA 085 PO");
    expect(e).toBeDefined();
    expect([...e!.attributes].filter((a) => a.startsWith("AREA_")).sort()).toEqual(["AREA_1", "AREA_6"]);
  });

  test("parses a course number written without a space between subject and number", () => {
    // The export writes "THEA085  PO"; the canonical key is "THEA 085 PO".
    expect(fixture.byCourse.has("THEA 085 PO")).toBe(true);
  });

  test("a measure value of 0 contributes no attribute", () => {
    const rows = parseRegistrarCsv(readFileSync(new URL("../fixtures/registrar-sample.csv", import.meta.url)));
    const zeroOnly = rows.filter((r) => r.measureValue === 0).map((r) => r.measureName);
    expect(zeroOnly.length).toBeGreaterThan(0);
  });

  test("records the title and affiliation", () => {
    const e = fixture.byCourse.get("THEA 085 PO")!;
    expect(e.title).toBe("Advanced Lighting Design");
    expect(e.affiliation).toBe("PO");
  });
});

describe("pivotRegistrar (the committed export)", () => {
  const real = pivotRegistrar(parseRegistrarCsv(readFileSync(fromRepoRoot("data/sources/registrar-ge-export-2026-09-08.csv"))));

  test("accounts for all 5,768 distinct courses in the export", () => {
    // AC-B02. 5,767 decompose to a CourseId; the remaining one is
    // "MUS031-042PO", a course RANGE rather than a course. It is reported in
    // `unparseable`, never silently dropped.
    expect(real.byCourse.size + real.unparseable.length).toBe(5768);
    expect(real.byCourse.size).toBe(5767);
    expect(real.unparseable).toEqual(["MUS031-042PO"]);
  });

  test("matches the eleven measured attribute counts exactly", () => {
    const tally: Record<string, number> = {};
    for (const e of real.byCourse.values()) for (const a of e.attributes) tally[a] = (tally[a] ?? 0) + 1;
    expect(tally).toMatchObject({
      AREA_1: 730, AREA_2: 931, AREA_3: 776, AREA_4: 334, AREA_5: 307, AREA_6: 292,
      WRITING_INTENSIVE: 179, SPEAKING_INTENSIVE: 177, ANALYZING_DIFFERENCE: 140,
      LANGUAGE: 251, PHYSICAL_EDUCATION: 241,
    });
  });

  test("exactly one course carries two Area tags", () => {
    const two = [...real.byCourse.entries()].filter(([, e]) => [...e.attributes].filter((a) => a.startsWith("AREA_")).length > 1);
    expect(two.map(([k]) => k)).toEqual(["THEA 085 PO"]);
  });

  test("counts, and does not silently drop, anything that will not parse", () => {
    expect(real.unparseable.length + real.byCourse.size).toBeGreaterThanOrEqual(5768);
    expect(Array.isArray(real.unparseable)).toBe(true);
  });

  test("covers the thirteen campus codes the brief measured", () => {
    const camps = new Set([...real.byCourse.values()].map((e) => e.affiliation));
    for (const c of ["PO", "SC", "CM", "HM", "PZ", "KS", "JP", "CH", "JT", "AF", "AA", "JM", "BK"]) {
      expect(camps.has(c)).toBe(true);
    }
  });

  test("Pomona is the largest campus in the export", () => {
    const counts: Record<string, number> = {};
    for (const e of real.byCourse.values()) counts[e.affiliation] = (counts[e.affiliation] ?? 0) + 1;
    expect(counts.PO).toBe(1774);
    expect(Math.max(...Object.values(counts))).toBe(counts.PO);
  });

  test("the brief's 1,785 Pomona figure is 1,774 PO + 10 three-letter variants + 1 range", () => {
    // The brief counted every Course Number ENDING in "PO". Ten rows spell the
    // affiliation "LPO"/"PPO" (e.g. "EA  030 LPO", "MUS 040 PPO"), which is not
    // one of the thirteen campus codes, and one is the MUS031-042PO range.
    const counts: Record<string, number> = {};
    for (const e of real.byCourse.values()) counts[e.affiliation] = (counts[e.affiliation] ?? 0) + 1;
    const poLike = (counts.PO ?? 0) + (counts.LPO ?? 0) + (counts.PPO ?? 0) + real.unparseable.length;
    expect(poLike).toBe(1785);
  });
});
