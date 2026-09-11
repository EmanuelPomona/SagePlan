import { describe, expect, test } from "vitest";
import { courseKey, termCode } from "@gradguide/shared";
import type { CompletedCourse, Course } from "@gradguide/shared";
import { buildCourseIndex } from "../record/courseIndex.ts";
import { parseTranscriptText } from "../transcript/parseTranscriptText.ts";

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
  course("MATH 030 PO", "Calculus I"),
  course("HIST 101 PO", "Modern Europe since 1789"),
  course("PSYC 052 SC", "Introduction to Psychology"),
]);
const run = (text: string, existing: CompletedCourse[] = []) => parseTranscriptText(text, INDEX, { existing });
const keys = (r: ReturnType<typeof run>) => r.rows.map((c) => courseKey(c.course));

describe("shapes a real transcript throws at it", () => {
  test("a bare course code", () => {
    const out = run("CSCI 051 PO");
    expect(keys(out)).toEqual(["CSCI 051 PO"]);
    expect(out.rows[0]!.term).toBeNull();
    expect(out.rows[0]!.grade).toBeNull();
  });

  test("a transcript row with a squashed code, a title, credits and a grade", () => {
    const out = run("CSCI051 PO  Introduction to Computer Science  1.00  A");
    expect(keys(out)).toEqual(["CSCI 051 PO"]);
    expect(out.rows[0]!.grade).toBe("A");
  });

  test("credits are not mistaken for a grade", () => {
    const out = run("MATH 030 PO  Calculus I  1.00");
    expect(out.rejected).toEqual([]);
    expect(out.rows[0]!.grade).toBeNull();
  });

  test("comma separated", () => {
    const out = run("CSCI 051 PO, Fall 2025, A-");
    expect(out.rows[0]!.grade).toBe("A-");
    expect(termCode(out.rows[0]!.term!)).toBe("FA2025");
  });

  test("tab separated", () => {
    const out = run("CSCI 051 PO\tFA2025\tA-");
    expect(termCode(out.rows[0]!.term!)).toBe("FA2025");
    expect(out.rows[0]!.grade).toBe("A-");
  });
});

describe("behaviour inherited from the spreadsheet parser it replaces", () => {
  test("grades are read case insensitively", () => {
    expect(run("CSCI 051 PO\tFA2025\ta-").rows[0]!.grade).toBe("A-");
    expect(run("CSCI 051 PO\tFA2025\tcr").rows[0]!.grade).toBe("CR");
  });

  test("a spreadsheet header row is skipped, not reported as a failure", () => {
    const out = run("Course\tTerm\tGrade\nCSCI 051 PO\tFA2025\tA");
    expect(out.rows).toHaveLength(1);
    expect(out.rejected).toEqual([]);
  });

  test("blank lines are ignored", () => {
    expect(run("CSCI 051 PO\n\n   \nMATH 030 PO").rows).toHaveLength(2);
  });
});

describe("term headings group the courses beneath them", () => {
  test("a heading applies to every line under it", () => {
    const out = run(["Fall 2025", "  CSCI 051 PO   Intro to CS            A", "  MATH 030 PO   Calculus I             B+"].join("\n"));

    expect(out.rows).toHaveLength(2);
    expect(out.rows.every((r) => termCode(r.term!) === "FA2025")).toBe(true);
    expect(out.rows.map((r) => r.grade)).toEqual(["A", "B+"]);
  });

  test("and stops at the next heading", () => {
    const out = run(["Fall 2025", "CSCI 051 PO  A", "Spring 2026", "MATH 030 PO  B"].join("\n"));

    expect(termCode(out.rows[0]!.term!)).toBe("FA2025");
    expect(termCode(out.rows[1]!.term!)).toBe("SP2026");
  });

  test("a term on the line itself beats the heading above it", () => {
    const out = run(["Fall 2025", "CSCI 051 PO  SP2026  A"].join("\n"));
    expect(termCode(out.rows[0]!.term!)).toBe("SP2026");
  });

  test.each([
    ["FA2025", "FA2025"], ["Fall 2025", "FA2025"], ["F25", "FA2025"],
    ["SP2026", "SP2026"], ["Spring 2026", "SP2026"], ["S26", "SP2026"],
    ["2025-26 Fall", "FA2025"],
  ])("heading %s reads as %s", (heading, expected) => {
    const out = run([heading, "CSCI 051 PO"].join("\n"));
    expect(termCode(out.rows[0]!.term!)).toBe(expected);
  });
});

describe("it reports what it could not place instead of guessing", () => {
  test("a code with a grade-shaped token that is not a grade is rejected, naming it", () => {
    const out = run("CSCI 051 PO  Q+");
    expect(out.rows).toEqual([]);
    expect(out.rejected[0]!.reason).toMatch(/grade/i);
    expect(out.rejected[0]!.reason).toContain("Q+");
  });

  test("a course not in the catalog is rejected", () => {
    const out = run("XXXX 999 PO");
    expect(out.rejected[0]!.reason).toMatch(/not in catalog/i);
  });

  test("a course already in the record is rejected, not duplicated", () => {
    const existing: CompletedCourse[] = [{
      course: { department: "CSCI", courseNumber: 51, suffix: "", affiliation: "PO" },
      term: null, grade: null, gradeMode: null, provenance: "pomona",
    }];
    const out = run("CSCI 051 PO", existing);

    expect(out.rows).toEqual([]);
    expect(out.rejected[0]!.reason).toMatch(/already in your record/i);
  });

  test("the same course twice in one paste is added once", () => {
    const out = run("CSCI 051 PO\nCSCI 051 PO");
    expect(out.rows).toHaveLength(1);
    expect(out.rejected).toHaveLength(1);
  });
});

describe("a realistic transcript blob", () => {
  const blob = `
POMONA COLLEGE
UNOFFICIAL TRANSCRIPT
Student: Jordan Avila          ID: 10084412
Printed 09/11/2026                                       Page 1 of 2

Fall 2025
Course        Title                                Credit   Grade
CSCI 051 PO   Introduction to Computer Science      1.00     A
MATH 030 PO   Calculus I                            1.00     B+
HIST 101 PO   Modern Europe since 1789              1.00     A-
                         Term GPA: 3.78   Cumulative GPA: 3.78

Spring 2026
PSYC 052 SC   Introduction to Psychology            1.00     B
                         Term GPA: 3.00   Cumulative GPA: 3.52

END OF TRANSCRIPT
`;

  test("yields only the courses, and nothing from the furniture", () => {
    const out = run(blob);

    expect(keys(out).sort()).toEqual(["CSCI 051 PO", "HIST 101 PO", "MATH 030 PO", "PSYC 052 SC"]);
  });

  test("with their terms and grades attached from the headings and rows", () => {
    const out = run(blob);
    const byKey = new Map(out.rows.map((r) => [courseKey(r.course), r]));

    expect(termCode(byKey.get("CSCI 051 PO")!.term!)).toBe("FA2025");
    expect(termCode(byKey.get("PSYC 052 SC")!.term!)).toBe("SP2026");
    expect(byKey.get("MATH 030 PO")!.grade).toBe("B+");
  });

  test("provenance follows the campus code", () => {
    const byKey = new Map(run(blob).rows.map((r) => [courseKey(r.course), r]));
    expect(byKey.get("CSCI 051 PO")!.provenance).toBe("pomona");
    expect(byKey.get("PSYC 052 SC")!.provenance).toBe("claremont");
  });

  test("GPA and page-number lines are not reported as rejections: they are furniture, not failures", () => {
    expect(run(blob).rejected).toEqual([]);
  });

  test("it reports that terms and grades were found, so the preview can say so", () => {
    expect(run(blob).detected).toEqual({ terms: true, grades: true });
  });

  test("a bare list of codes reports neither", () => {
    expect(run("CSCI 051 PO\nMATH 030 PO").detected).toEqual({ terms: false, grades: false });
  });
});

describe("robustness", () => {
  test("empty input", () => {
    expect(run("")).toEqual({ rows: [], rejected: [], detected: { terms: false, grades: false } });
  });

  test("a 200-line blob of noise never throws and finds nothing", () => {
    const noise = Array.from({ length: 200 }, (_, i) => `Page ${i} of 200   Cumulative GPA: 3.42`).join("\n");
    expect(() => run(noise)).not.toThrow();
    expect(run(noise).rows).toEqual([]);
  });
});
