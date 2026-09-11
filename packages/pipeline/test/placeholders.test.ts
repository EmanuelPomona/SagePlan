import { describe, expect, test } from "vitest";
import type { Course } from "@gradguide/shared";
import { classifyCourse, applyMembership } from "../src/placeholders.ts";

const course = (over: Partial<Course> & { dept?: string; title?: string }): Course => ({
  id: { department: over.dept ?? "CSCI", courseNumber: 51, suffix: "", affiliation: "PO" },
  title: over.title ?? "Introduction to Computer Science",
  description: "", department: over.dept ?? "CSCI",
  credits: { min: 1, max: 1, repeatable: false, maxRepeats: 0 },
  attributes: [], gradeMode: "", prereqText: null, prereqRule: null,
  catalogYear: "2026-2027", sourceUrl: "https://catalog.pomona.edu/x", lastVerified: "2026-09-08T00:00:00Z",
  ...over,
});

describe("classifyCourse — ADR-016 catalog membership", () => {
  test("keeps an ordinary course", () => {
    expect(classifyCourse(course({})).verdict).toBe("keep");
  });

  test("excludes the TEST department", () => {
    const r = classifyCourse(course({ dept: "TEST", title: "Test Course-Disregard" }));
    expect(r.verdict).toBe("exclude");
    expect(r.reason).toContain("TEST");
  });

  test("excludes a title beginning DNR:", () => {
    const r = classifyCourse(course({ title: "DNR: Add No Restrictions" }));
    expect(r.verdict).toBe("exclude");
    expect(r.reason).toContain("DNR:");
  });

  test("matches DNR: case-insensitively and after leading whitespace", () => {
    expect(classifyCourse(course({ title: "  dnr: whatever" })).verdict).toBe("exclude");
  });

  test("does not exclude a legitimate title that merely contains DNR later on", () => {
    expect(classifyCourse(course({ title: "Genetics of DNR Signalling" })).verdict).toBe("keep");
  });

  // ADR-016: "anything else suspicious is reported, not silently dropped".
  // THEA 007 PO is an ACTIVE Coursedog record titled "repeat test course" — it
  // matches none of the three exclusion patterns, so dropping it would exceed
  // the ruling, and ignoring it would hide it.
  test("reports a suspicious title without dropping the course", () => {
    const r = classifyCourse(course({ dept: "THEA", title: "repeat test course" }));
    expect(r.verdict).toBe("suspicious");
    expect(r.reason).toBeTruthy();
  });

  test("reports a 'disregard' title as suspicious when the department is legitimate", () => {
    expect(classifyCourse(course({ dept: "THEA", title: "Please disregard" })).verdict).toBe("suspicious");
  });

  test("a suspicious course is still kept in the catalog", () => {
    expect(classifyCourse(course({ dept: "THEA", title: "repeat test course" })).verdict).not.toBe("exclude");
  });

  test("does not flag a real course whose title contains the word test", () => {
    expect(classifyCourse(course({ dept: "PSYC", title: "Psychological Testing and Assessment" })).verdict).toBe("keep");
  });

  test("does not flag a real course titled Test Theory", () => {
    expect(classifyCourse(course({ dept: "PSYC", title: "Test Theory" })).verdict).toBe("keep");
  });
});

describe("applyMembership", () => {
  const c = (dept: string, title: string, aff = "PO"): Course => ({
    id: { department: dept, courseNumber: 1, suffix: "", affiliation: aff },
    title, description: "", department: dept,
    credits: { min: 1, max: 1, repeatable: false, maxRepeats: 0 },
    attributes: [], gradeMode: "", prereqText: null, prereqRule: null,
    catalogYear: "2026-2027", sourceUrl: "https://catalog.pomona.edu/x", lastVerified: "2026-09-08T00:00:00Z",
  });

  test("keeps ordinary courses and drops the named placeholder patterns", () => {
    const r = applyMembership([c("CSCI", "Intro"), c("TEST", "Test Course-Disregard", "PZ"), c("SC", "DNR: Add No Restrictions", "SC")]);
    expect(r.kept.map((x) => x.id.department)).toEqual(["CSCI"]);
    expect(r.excluded).toHaveLength(2);
  });

  test("keeps a suspicious course but records it", () => {
    const r = applyMembership([c("THEA", "repeat test course")]);
    expect(r.kept).toHaveLength(1);
    expect(r.suspicious).toHaveLength(1);
  });

  test("returns empty lists for a clean catalog", () => {
    const r = applyMembership([c("CSCI", "Intro")]);
    expect(r.excluded).toEqual([]);
    expect(r.suspicious).toEqual([]);
  });

  test("preserves input order of the kept courses", () => {
    const r = applyMembership([c("AAA", "One"), c("TEST", "Test Course-Disregard"), c("BBB", "Two")]);
    expect(r.kept.map((x) => x.title)).toEqual(["One", "Two"]);
  });
});
