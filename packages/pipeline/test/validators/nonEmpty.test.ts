import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkNonEmpty } from "../../src/validators/nonEmpty.ts";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "gg-ne-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const meta = { schemaVersion: 1, generator: "t", generatedAt: "2026-09-08T00:00:00Z", fetchedAt: "2026-09-08T00:00:00Z", sourceUrl: "https://x.test/a", catalogYear: "2026-2027" };
const course = { id: { department: "CSCI", courseNumber: 51, suffix: "", affiliation: "PO" }, title: "T", description: "", department: "C", credits: { min: 1, max: 1, repeatable: false, maxRepeats: 0 }, attributes: [], gradeMode: "", prereqText: null, prereqRule: null, catalogYear: "2026-2027", sourceUrl: "https://catalog.pomona.edu/x", lastVerified: "2026-09-08T00:00:00Z" };

describe("checkNonEmpty (validator 2)", () => {
  test("passes when the catalog has courses", () => {
    writeFileSync(join(dir, "catalog.json"), JSON.stringify({ meta, courses: [course] }));
    expect(checkNonEmpty(dir).check.status).toBe("pass");
  });

  test("fails when the catalog is empty", () => {
    writeFileSync(join(dir, "catalog.json"), JSON.stringify({ meta, courses: [] }));
    const { check } = checkNonEmpty(dir);
    expect(check.status).toBe("fail");
    expect(check.details.join(" ")).toContain("empty");
  });

  test("fails when the catalog is below the floor", () => {
    writeFileSync(join(dir, "catalog.json"), JSON.stringify({ meta, courses: [course] }));
    expect(checkNonEmpty(dir, 1000).check.status).toBe("fail");
  });

  test("fails when a sections file is empty", () => {
    writeFileSync(join(dir, "catalog.json"), JSON.stringify({ meta, courses: [course] }));
    writeFileSync(join(dir, "sections-FA2026.json"), JSON.stringify({ meta, term: { year: 2026, term: "FA" }, sections: [] }));
    expect(checkNonEmpty(dir).check.status).toBe("fail");
  });

  test("reports the counts when everything is healthy", () => {
    writeFileSync(join(dir, "catalog.json"), JSON.stringify({ meta, courses: [course] }));
    expect(checkNonEmpty(dir).check.details.join(" ")).toContain("1 courses");
  });

  test("uses the id 'non-empty'", () => {
    expect(checkNonEmpty(dir).check.id).toBe("non-empty");
  });
});
