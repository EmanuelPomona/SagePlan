import { describe, expect, test } from "vitest";
import { mapGeCodes } from "../../src/hyperschedule/geCodes.ts";

describe("mapGeCodes", () => {
  test("maps Pomona codes and separates other colleges' codes", () => {
    const r = mapGeCodes(["1A3", "1ADR", "2XX"]);
    expect(r.attrs).toEqual(["AREA_3", "ANALYZING_DIFFERENCE"]);
    expect(r.nonPomona).toEqual(["2XX"]);
    expect(r.unknownPomona).toEqual([]);
  });

  test("reports an unknown Pomona code instead of throwing it away", () => {
    const r = mapGeCodes(["1ZZZ"]);
    expect(r.attrs).toEqual([]);
    expect(r.unknownPomona).toEqual(["1ZZZ"]);
  });

  test("drops 1DDP: it is not a GE attribute", () => {
    const r = mapGeCodes(["1A2", "1DDP"]);
    expect(r.attrs).toEqual(["AREA_2"]);
    expect(r.unknownPomona).toEqual([]);
  });

  // L-7: these were allowlisted as "PE activity codes". They are not — 122 of the
  // 123 FA2026 sections carrying one have no 1PE, and they appear on Art History
  // and Art courses. Reporting them is what AC-B04's "or is reported" requires.
  test("reports the 1P1..1P10 codes as unrecognised rather than hiding them", () => {
    const r = mapGeCodes(["1P1", "1P10"]);
    expect(r.attrs).toEqual([]);
    expect(r.unknownPomona).toEqual(["1P1", "1P10"]);
  });

  test("still allowlists 1DDP, whose meaning is established", () => {
    expect(mapGeCodes(["1DDP"]).unknownPomona).toEqual([]);
  });

  test("keeps a subject code such as AFRI out of attributes", () => {
    expect(mapGeCodes(["AFRI", "1A1"]).attrs).toEqual(["AREA_1"]);
  });

  test("de-duplicates repeated codes", () => {
    expect(mapGeCodes(["1A1", "1A1"]).attrs).toEqual(["AREA_1"]);
  });

  test("maps every Pomona GE code in the shared table", () => {
    const r = mapGeCodes(["1A1","1A2","1A3","1A4","1A5","1A6","1WIR","1SIR","1ADR","1FL","1PE","1CP"]);
    expect(r.attrs).toHaveLength(12);
  });
});
