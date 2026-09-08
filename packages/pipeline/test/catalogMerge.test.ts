import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readExistingCourses, readExistingMeta, mergeCourses } from "../src/catalogMerge.ts";
import { PipelineError } from "../src/errors.ts";
import type { Course } from "@gradguide/shared";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "gg-merge-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const meta = { schemaVersion: 1, generator: "t", generatedAt: "2026-09-08T00:00:00Z", fetchedAt: "2026-09-08T00:00:00Z", sourceUrl: "https://x.test/a", catalogYear: "2026-2027" };
const course = (aff: string, n = 1): Course => ({
  id: { department: "CSCI", courseNumber: n, suffix: "", affiliation: aff },
  title: "T", description: "", department: "CSCI",
  credits: { min: 1, max: 1, repeatable: false, maxRepeats: 0 },
  attributes: [], gradeMode: "", prereqText: null, prereqRule: null,
  catalogYear: "2026-2027", sourceUrl: "https://catalog.pomona.edu/x", lastVerified: "2026-09-08T00:00:00Z",
});
const p = () => join(dir, "catalog.json");

describe("readExistingCourses", () => {
  test("returns an empty list when there is genuinely no catalog yet", () => {
    expect(readExistingCourses(p())).toEqual([]);
  });

  test("reads the courses from a valid catalog", () => {
    writeFileSync(p(), JSON.stringify({ meta, courses: [course("PO"), course("HM", 5)] }));
    expect(readExistingCourses(p())).toHaveLength(2);
  });

  // The bug this guards: returning [] for a file that EXISTS but is unreadable is
  // indistinguishable from "no catalog", so the caller preserves nothing and
  // writes a PO-only catalog with exit 0 — silently deleting every 5C course.
  test("THROWS rather than returning empty when the catalog exists but is not JSON", () => {
    writeFileSync(p(), '{"meta":{},"courses":[');
    expect(() => readExistingCourses(p())).toThrow(PipelineError);
  });

  test("THROWS rather than returning empty when the catalog fails its schema", () => {
    writeFileSync(p(), JSON.stringify({ meta: { ...meta, schemaVersion: 2 }, courses: [course("HM", 5)] }));
    expect(() => readExistingCourses(p())).toThrow(PipelineError);
  });

  test("the thrown error names the file and tells the operator what to do", () => {
    writeFileSync(p(), "not json at all");
    try { readExistingCourses(p()); } catch (e) {
      expect((e as PipelineError).code).toBe("CATALOG_UNREADABLE");
      expect((e as PipelineError).message).toContain("catalog.json");
    }
  });
});

describe("readExistingMeta", () => {
  test("returns null when there is no catalog", () => {
    expect(readExistingMeta(p())).toBeNull();
  });

  test("returns the meta of a valid catalog", () => {
    writeFileSync(p(), JSON.stringify({ meta, courses: [course("PO")] }));
    expect(readExistingMeta(p())?.sourceUrl).toBe("https://x.test/a");
  });
});

describe("mergeCourses", () => {
  test("replaces the owned affiliation and preserves the rest", () => {
    const existing = [course("PO", 1), course("HM", 5), course("SC", 7)];
    const merged = mergeCourses(existing, [course("PO", 2)], "PO");
    const affs = merged.map((c) => c.id.affiliation).sort();
    expect(affs).toEqual(["HM", "PO", "SC"]);
    expect(merged.find((c) => c.id.affiliation === "PO")!.id.courseNumber).toBe(2);
  });
});
