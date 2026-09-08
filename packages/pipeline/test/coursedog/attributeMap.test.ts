import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { COURSEDOG_ATTRIBUTE_MAP, mapAttributes, GE_GUARD_RE } from "../../src/coursedog/attributeMap.ts";

const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/coursedog-sample.json", import.meta.url), "utf8"),
) as { data: { attributes?: string[] }[] };

describe("mapAttributes", () => {
  test("splits a semicolon-delimited composite entry and maps only the GE tokens", () => {
    const r = mapAttributes(["PO Area 2 Requirement ;All Government/Politics ;Politics"]);
    expect(r.attrs).toEqual(["AREA_2"]);
    expect(r.unmapped).toEqual([]);
  });

  test("maps every Pomona GE token to its GeAttribute", () => {
    expect(mapAttributes(["PO Area 1 Requirement"]).attrs).toEqual(["AREA_1"]);
    expect(mapAttributes(["PO Area 6 Requirement"]).attrs).toEqual(["AREA_6"]);
    expect(mapAttributes(["PO Writing Intensive Req"]).attrs).toEqual(["WRITING_INTENSIVE"]);
    expect(mapAttributes(["PO Speaking Intensive"]).attrs).toEqual(["SPEAKING_INTENSIVE"]);
    expect(mapAttributes(["PO Analyzing Difference"]).attrs).toEqual(["ANALYZING_DIFFERENCE"]);
    expect(mapAttributes(["PO Language Requirement"]).attrs).toEqual(["LANGUAGE"]);
    expect(mapAttributes(["PO Phys Ed Requirement"]).attrs).toEqual(["PHYSICAL_EDUCATION"]);
    expect(mapAttributes(["PO Community Partnership"]).attrs).toEqual(["COMMUNITY_PARTNERSHIP"]);
  });

  test("keeps several GE attributes from one entry, de-duplicated and stable", () => {
    const r = mapAttributes([
      "PO Area 2 Requirement ;PO Speaking Intensive;Politics",
      "PO Area 2 Requirement ;Anthropology",
    ]);
    expect(r.attrs).toEqual(["AREA_2", "SPEAKING_INTENSIVE"]);
  });

  test("drops PO DDP Courses: it is not a GE attribute", () => {
    const r = mapAttributes(["PO Area 2 Requirement ;PO DDP Courses"]);
    expect(r.attrs).toEqual(["AREA_2"]);
    expect(r.unmapped).toEqual([]);
    expect(r.dropped).toContain("PO DDP Courses");
  });

  test("reports an unknown GE-looking token as unmapped rather than dropping it", () => {
    const r = mapAttributes(["PO Area 9 Requirement ;Politics"]);
    expect(r.attrs).toEqual([]);
    expect(r.unmapped).toEqual(["PO Area 9 Requirement"]);
  });

  test("does not report the non-GE lookalikes All Languages and Physical Education as unmapped", () => {
    // Both trip the guard keywords but are subject groupings, not Pomona GE tags.
    const r = mapAttributes(["All Languages ;French", "Physical Education"]);
    expect(r.attrs).toEqual([]);
    expect(r.unmapped).toEqual([]);
    expect(r.dropped).toEqual(expect.arrayContaining(["All Languages", "Physical Education"]));
  });

  test("counts ordinary non-GE subject tokens as dropped, never unmapped", () => {
    const r = mapAttributes(["Music", "Biology ;Neuroscience"]);
    expect(r.unmapped).toEqual([]);
    expect(r.dropped).toEqual(["Music", "Biology", "Neuroscience"]);
  });

  test("every GE token present in the captured fixture maps cleanly", () => {
    const unmapped = new Set<string>();
    for (const record of fixture.data) {
      for (const u of mapAttributes(record.attributes ?? []).unmapped) unmapped.add(u);
    }
    expect([...unmapped]).toEqual([]);
  });

  test("the guard regex matches a new Area token so the build would fail on it", () => {
    expect(GE_GUARD_RE.test("PO Area 9 Requirement")).toBe(true);
    expect(GE_GUARD_RE.test("Music")).toBe(false);
  });

  test("the map covers all twelve GeAttribute values exactly once", () => {
    const values = Object.values(COURSEDOG_ATTRIBUTE_MAP);
    expect(new Set(values).size).toBe(12);
    expect(values.length).toBe(12);
  });
});
