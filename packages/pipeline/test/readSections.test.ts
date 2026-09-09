import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readSections } from "../src/readSections.ts";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "gg-rs-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const meta = { schemaVersion: 1, generator: "t", generatedAt: "2026-09-08T00:00:00Z", fetchedAt: "2026-09-08T00:00:00Z", sourceUrl: "https://x.test/a", catalogYear: "2026-2027" };
const section = { course: { department: "CSCI", courseNumber: 51, suffix: "", affiliation: "PO" }, sectionNumber: 1, term: { year: 2026, term: "FA" }, half: null, instructors: [], meetings: [], seatsTotal: 1, seatsFilled: 0, permCount: 0, status: "O", geCodes: [] };

describe("readSections", () => {
  test("reads every term file", () => {
    writeFileSync(join(dir, "sections-FA2026.json"), JSON.stringify({ meta, term: { year: 2026, term: "FA" }, sections: [section] }));
    expect(readSections(dir).sections).toHaveLength(1);
  });

  // Guards finding 25: readSections feeds validator 4, so a file it cannot read
  // silently REDUCES that validator's coverage instead of failing it. The bare
  // catch hid that entirely.
  test("reports an unreadable term file instead of swallowing it", () => {
    writeFileSync(join(dir, "sections-FA2026.json"), "{ truncated");
    const r = readSections(dir);
    expect(r.sections).toHaveLength(0);
    expect(r.unreadable).toEqual(["sections-FA2026.json"]);
  });

  test("reports a term file that fails its schema", () => {
    writeFileSync(join(dir, "sections-FA2026.json"), JSON.stringify({ meta, term: { year: 2026, term: "FA" }, sections: [{ nope: true }] }));
    expect(readSections(dir).unreadable).toEqual(["sections-FA2026.json"]);
  });

  test("returns empty and reports nothing when the directory has no term files", () => {
    expect(readSections(dir)).toEqual({ sections: [], unreadable: [] });
  });
});
