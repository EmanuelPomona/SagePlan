import { describe, expect, test } from "vitest";
import { emptyPlan } from "@sageplan/shared";
import type { CompletedCourse, Course, StudentPlan } from "@sageplan/shared";
import { summarise } from "../record/RecordSummary.tsx";

function course(key: string, credits: number): Course {
  const [dept, num, aff] = key.split(" ") as [string, string, string];
  return {
    id: { department: dept, courseNumber: Number(num), suffix: "", affiliation: aff },
    title: key, description: "", department: dept,
    credits: { min: credits, max: credits, repeatable: false, maxRepeats: 0 },
    attributes: [], gradeMode: "Letter", prereqText: null, prereqRule: null,
    catalogYear: "2026-2027", sourceUrl: "https://catalog.pomona.edu/x", lastVerified: "2026-09-08T00:00:00Z",
  };
}
const CATALOG = [course("CSCI 051 PO", 1), course("PE 001 PO", 0.25)];
const entry = (dept: string, n: number, over: Partial<CompletedCourse> = {}): CompletedCourse => ({
  course: { department: dept, courseNumber: n, suffix: "", affiliation: "PO" },
  term: null, grade: null, gradeMode: null, provenance: "pomona", ...over,
});
const planOf = (completed: CompletedCourse[]): StudentPlan => ({ ...emptyPlan("2026-2027", null), completed });

describe("summarise", () => {
  test("credits come from the catalog, including quarter-credit courses", () => {
    const out = summarise(planOf([entry("CSCI", 51), entry("PE", 1)]), CATALOG);

    expect(out.courses).toBe(2);
    expect(out.credits).toBe(1.25);
  });

  test("a per-course credit override wins over the catalog", () => {
    expect(summarise(planOf([entry("CSCI", 51, { credits: 0.5 })]), CATALOG).credits).toBe(0.5);
  });

  test("a course the catalog does not know counts as one credit", () => {
    expect(summarise(planOf([entry("ZZZZ", 999)]), CATALOG).credits).toBe(1);
  });

  test("it reports how many grades were actually recorded, so the record can say 'assumed passed'", () => {
    const out = summarise(planOf([entry("CSCI", 51), entry("PE", 1, { grade: "B" })]), CATALOG);
    expect(out.gradesRecorded).toBe(1);
  });

  test("an empty plan totals nothing and does not throw", () => {
    expect(summarise(planOf([]), CATALOG)).toEqual({ courses: 0, credits: 0, exams: 0, gradesRecorded: 0 });
  });
});
