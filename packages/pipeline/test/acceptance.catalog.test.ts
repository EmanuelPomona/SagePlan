import { describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { CatalogArtefactSchema, courseKey, type Course } from "@gradguide/shared";
import { fromRepoRoot } from "../src/env.ts";

/**
 * Acceptance guards on the SHIPPED artefact (AC-B00, AC-B01, AC-B01b).
 *
 * These assert against data/catalog.json itself rather than a fixture, because
 * the criteria are about what actually ships. They are the regression tests for
 * reviewer M-5 and for the two filters that were measured to destroy real data.
 */
const path = fromRepoRoot("data/catalog.json");
const catalog: Course[] = existsSync(path)
  ? CatalogArtefactSchema.parse(JSON.parse(readFileSync(path, "utf8"))).courses
  : [];
const byKey = new Map(catalog.map((c) => [courseKey(c.id), c]));

describe("AC-B00 — no placeholder records in the shipped catalog", () => {
  test("the catalog is present to assert against", () => {
    expect(catalog.length).toBeGreaterThan(0);
  });

  test("no course sits in the TEST department", () => {
    expect(catalog.filter((c) => c.id.department === "TEST").map((c) => courseKey(c.id))).toEqual([]);
  });

  test("no title begins with DNR:", () => {
    expect(catalog.filter((c) => /^\s*DNR:/i.test(c.title)).map((c) => courseKey(c.id))).toEqual([]);
  });

  test("THEA 007 PO is gone, via the exact-key denylist", () => {
    expect(byKey.has("THEA 007 PO")).toBe(false);
  });
});

describe("AC-B00 — the courses a substring filter would have destroyed", () => {
  // Five of these six carry GE attributes. Asserting the ATTRIBUTES rather than
  // mere existence fails louder, because the failure being guarded against is a
  // student being told they still owe an Area 1 and a Writing Intensive they
  // have already completed.
  const EXPECTED: [string, string[]][] = [
    ["ENGL 170R PO", ["AREA_1", "WRITING_INTENSIVE"]],
    ["HIST 132 PO", ["AREA_3"]],
    ["RLST 189N PO", ["AREA_3"]],
    ["RLST 061 SC", ["AREA_3"]],
    ["CHST 055 CH", ["AREA_3"]],
    ["ENGL 076 PZ", []],
  ];

  test.each(EXPECTED)("%s survives with exactly its GE attributes", (key, attrs) => {
    const course = byKey.get(key);
    expect(course, `${key} must not be deleted by any placeholder rule`).toBeDefined();
    expect([...course!.attributes].sort()).toEqual([...attrs].sort());
  });

  test("all 13 Associated Kyoto Program courses survive", () => {
    // department PREG holds these plus THEA 007 PO; excluding by department
    // would delete the study-abroad records the residency requirement counts.
    expect(catalog.filter((c) => c.id.department === "AKP")).toHaveLength(13);
  });
});

describe("AC-B01 — the pinned predicate", () => {
  test("at least 1,900 courses carry affiliation PO", () => {
    expect(catalog.filter((c) => c.id.affiliation === "PO").length).toBeGreaterThanOrEqual(1900);
  });

  test("every courseKey is unique", () => {
    const keys = catalog.map((c) => courseKey(c.id));
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("every course validates against CourseSchema", () => {
    expect(CatalogArtefactSchema.safeParse(JSON.parse(readFileSync(path, "utf8"))).success).toBe(true);
  });
});
