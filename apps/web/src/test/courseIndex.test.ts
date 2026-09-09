import { describe, expect, test } from "vitest";
import { courseKey } from "@gradguide/shared";
import type { Course } from "@gradguide/shared";
import { buildCourseIndex, search } from "../record/courseIndex.ts";

function course(key: string, title: string, attributes: Course["attributes"] = []): Course {
  const [dept, num, aff] = key.split(" ") as [string, string, string];
  return {
    id: { department: dept, courseNumber: Number(num.replace(/\D/g, "")), suffix: num.replace(/[0-9]/g, ""), affiliation: aff },
    title,
    description: "",
    department: dept,
    credits: { min: 1, max: 1, repeatable: false, maxRepeats: 0 },
    attributes,
    gradeMode: "Letter",
    prereqText: null,
    prereqRule: null,
    catalogYear: "2026-2027",
    sourceUrl: "https://catalog.pomona.edu/x",
    lastVerified: "2026-09-08T00:00:00Z",
  };
}

const CATALOG = [
  course("CSCI 005 HM", "Introduction to Computer Science"),
  course("CSCI 051 PO", "Introduction to Computer Science"),
  course("CSCI 062 PO", "Data Structures and Advanced Programming"),
  course("ID 001 PO", "Critical Inquiry Seminar"),
  course("HIST 101 PO", "Modern Europe since 1789"),
  course("ENGL 067 PO", "Introduction to Literary Theory", ["AREA_1", "WRITING_INTENSIVE"]),
  course("MATH 030 PO", "Calculus I"),
];
const INDEX = buildCourseIndex(CATALOG);
const keys = (q: string, limit?: number) => search(INDEX, q, limit).map((c) => courseKey(c.id));

describe("search ranking", () => {
  test("an exact course number outranks a longer number that merely starts with it", () => {
    // "csci 5" is CSCI 005 exactly, and only a prefix of CSCI 051.
    expect(keys("csci 5")[0]).toBe("CSCI 005 HM");
  });

  test("a full course key prefix wins outright", () => {
    expect(keys("CSCI 051")[0]).toBe("CSCI 051 PO");
  });

  test("department alone returns that department, ordered by course key", () => {
    expect(keys("csci")).toEqual(["CSCI 005 HM", "CSCI 051 PO", "CSCI 062 PO"]);
  });

  test("title tokens match even when the department does not", () => {
    expect(keys("intro comp")).toContain("CSCI 051 PO");
    expect(keys("intro comp")).toContain("CSCI 005 HM");
  });

  test("a short numeric query still finds a zero-padded course", () => {
    expect(keys("ID 1")).toContain("ID 001 PO");
  });

  test("matching is case and space insensitive", () => {
    expect(keys("csci051")).toContain("CSCI 051 PO");
    expect(keys("  HIST  101  ")).toContain("HIST 101 PO");
  });

  test("results are limited, eight by default", () => {
    const many = buildCourseIndex(
      Array.from({ length: 40 }, (_, i) => course(`BIOL ${String(i + 1).padStart(3, "0")} PO`, `Biology ${i + 1}`)),
    );
    expect(search(many, "biol")).toHaveLength(8);
    expect(search(many, "biol", 3)).toHaveLength(3);
  });

  test("an empty or whitespace query returns nothing rather than everything", () => {
    expect(keys("")).toEqual([]);
    expect(keys("   ")).toEqual([]);
  });

  test("a query matching nothing returns an empty list, never throws", () => {
    expect(keys("zzzzz")).toEqual([]);
  });

  test("a title substring matches when no token starts with the query", () => {
    expect(keys("europe")).toContain("HIST 101 PO");
  });
});

describe("buildCourseIndex", () => {
  test("looks a course up by its canonical key", () => {
    expect(INDEX.byKey.get("HIST 101 PO")?.title).toBe("Modern Europe since 1789");
  });

  test("an empty catalog is valid and searchable", () => {
    expect(search(buildCourseIndex([]), "anything")).toEqual([]);
  });
});
