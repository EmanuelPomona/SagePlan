import { describe, expect, test } from "vitest";
import { courseKey } from "@gradguide/shared";
import type { CompletedCourse, Course, TermId } from "@gradguide/shared";
import { buildCourseIndex } from "../record/courseIndex.ts";
import { parsePaste } from "../record/parsePaste.ts";

function course(key: string, title: string): Course {
  const [dept, num, aff] = key.split(" ") as [string, string, string];
  return {
    id: { department: dept, courseNumber: Number(num.replace(/\D/g, "")), suffix: num.replace(/[0-9]/g, ""), affiliation: aff },
    title, description: "", department: dept,
    credits: { min: 1, max: 1, repeatable: false, maxRepeats: 0 },
    attributes: [], gradeMode: "Letter", prereqText: null, prereqRule: null,
    catalogYear: "2026-2027", sourceUrl: "https://catalog.pomona.edu/x", lastVerified: "2026-09-08T00:00:00Z",
  };
}

const INDEX = buildCourseIndex([
  course("CSCI 051 PO", "Introduction to Computer Science"),
  course("HIST 101 PO", "Modern Europe since 1789"),
  course("PSYC 052 SC", "Introduction to Psychology"),
]);
const FA2025: TermId = { year: 2025, term: "FA" };
const run = (text: string, existing: CompletedCourse[] = []) =>
  parsePaste(text, INDEX, { term: FA2025, existing });

describe("accepted shapes", () => {
  test("code only, using the default term", () => {
    const out = run("CSCI 051 PO");
    expect(out.rejected).toEqual([]);
    expect(out.rows).toHaveLength(1);
    expect(courseKey(out.rows[0]!.course)).toBe("CSCI 051 PO");
    expect(out.rows[0]!.term).toEqual(FA2025);
    expect(out.rows[0]!.grade).toBe("");
  });

  test("code and term, tab separated", () => {
    const out = run("CSCI 051 PO\tFA2025");
    expect(out.rows[0]!.term).toEqual({ year: 2025, term: "FA" });
  });

  test("code, term and grade, tab separated", () => {
    const out = run("CSCI 051 PO\tFA2025\tA-");
    expect(out.rows[0]!.grade).toBe("A-");
  });

  test("comma separated, squashed code, spelled-out term", () => {
    const out = run("CSCI051 PO, Fall 2025, A-");
    expect(out.rejected).toEqual([]);
    expect(courseKey(out.rows[0]!.course)).toBe("CSCI 051 PO");
    expect(out.rows[0]!.term).toEqual({ year: 2025, term: "FA" });
    expect(out.rows[0]!.grade).toBe("A-");
  });

  test.each([
    ["FA2025", { year: 2025, term: "FA" }],
    ["Fall 2025", { year: 2025, term: "FA" }],
    ["F25", { year: 2025, term: "FA" }],
    ["SP2026", { year: 2026, term: "SP" }],
    ["Spring 2026", { year: 2026, term: "SP" }],
    ["S26", { year: 2026, term: "SP" }],
  ])("term %s parses", (text, expected) => {
    expect(run(`CSCI 051 PO\t${text}`).rows[0]!.term).toEqual(expected);
  });

  test("grades are accepted case insensitively", () => {
    expect(run("CSCI 051 PO\tFA2025\ta-").rows[0]!.grade).toBe("A-");
    expect(run("CSCI 051 PO\tFA2025\tcr").rows[0]!.grade).toBe("CR");
  });

  test("provenance follows the affiliation", () => {
    expect(run("CSCI 051 PO").rows[0]!.provenance).toBe("pomona");
    expect(run("PSYC 052 SC").rows[0]!.provenance).toBe("claremont");
  });

  test("several lines, blank lines ignored", () => {
    const out = run("CSCI 051 PO\n\n  \nHIST 101 PO\n");
    expect(out.rows).toHaveLength(2);
    expect(out.rejected).toEqual([]);
  });

  test("a header line is skipped rather than rejected", () => {
    const out = run("Course\tTerm\tGrade\nCSCI 051 PO\tFA2025\tA");
    expect(out.rows).toHaveLength(1);
    expect(out.rejected).toEqual([]);
  });
});

describe("rejections name the field and the line", () => {
  test("a course not in the catalog", () => {
    const out = run("XXXX 999 PO");
    expect(out.rows).toEqual([]);
    expect(out.rejected[0]).toMatchObject({ line: 1, text: "XXXX 999 PO" });
    expect(out.rejected[0]!.reason).toMatch(/not in catalog/i);
  });

  test("an unreadable course code", () => {
    const out = run("this is not a course");
    expect(out.rejected[0]!.reason).toMatch(/course code/i);
  });

  test("an unreadable term names the term", () => {
    const out = run("CSCI 051 PO\tWinter 2025");
    expect(out.rejected[0]!.reason).toMatch(/term/i);
    expect(out.rejected[0]!.reason).toContain("Winter 2025");
  });

  test("an unreadable grade names the grade", () => {
    const out = run("CSCI 051 PO\tFA2025\tQ+");
    expect(out.rejected[0]!.reason).toMatch(/grade/i);
    expect(out.rejected[0]!.reason).toContain("Q+");
  });

  test("a course already in the record is flagged, not silently duplicated", () => {
    const existing: CompletedCourse[] = [{
      course: { department: "CSCI", courseNumber: 51, suffix: "", affiliation: "PO" },
      term: FA2025, grade: "A", gradeMode: "letter", provenance: "pomona",
    }];
    const out = run("CSCI 051 PO\tFA2025", existing);

    expect(out.rows).toEqual([]);
    expect(out.rejected[0]!.reason).toMatch(/already in your record/i);
  });

  test("the same course in a DIFFERENT term is not a duplicate", () => {
    const existing: CompletedCourse[] = [{
      course: { department: "CSCI", courseNumber: 51, suffix: "", affiliation: "PO" },
      term: { year: 2024, term: "FA" }, grade: "A", gradeMode: "letter", provenance: "pomona",
    }];
    expect(run("CSCI 051 PO\tFA2025", existing).rows).toHaveLength(1);
  });

  test("a duplicate WITHIN the pasted text is caught too", () => {
    const out = run("CSCI 051 PO\tFA2025\nCSCI 051 PO\tFA2025");
    expect(out.rows).toHaveLength(1);
    expect(out.rejected).toHaveLength(1);
  });

  test("good lines survive alongside bad ones", () => {
    const out = run("CSCI 051 PO\nnonsense\nHIST 101 PO");
    expect(out.rows).toHaveLength(2);
    expect(out.rejected).toHaveLength(1);
    expect(out.rejected[0]!.line).toBe(2);
  });

  test("empty input yields nothing and does not throw", () => {
    expect(run("")).toEqual({ rows: [], rejected: [] });
  });
});
