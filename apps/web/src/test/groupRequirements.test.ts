import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { evaluate } from "@gradguide/engine";
import { CatalogArtefactSchema, ProgramSchema, emptyPlan } from "@gradguide/shared";
import type { Course, Program, StudentPlan, StudentType } from "@gradguide/shared";
import { groupRequirements } from "../audit/groupRequirements.ts";

const read = (rel: string) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));
const GE: Program = ProgramSchema.parse(read("../../../../data/programs/general-education-2026.json"));
const CATALOG: Course[] = CatalogArtefactSchema.parse(read("../../dev-fixtures/catalog.json")).courses;

function planFor(studentType: StudentType): StudentPlan {
  return { ...emptyPlan("2026-2027", { year: 2025, term: "FA" }, studentType) };
}
const groupsFor = (studentType: StudentType) => {
  const plan = planFor(studentType);
  return groupRequirements(GE, evaluate(plan, [GE], CATALOG), plan);
};

describe("grouping", () => {
  test("the general education program yields its six groups, in order", () => {
    // No "Grade point average" group: ADR-015 moved the 2.00 rule into the
    // advisories, so the app never asks for a grade and no grade ever travels
    // inside a share link.
    expect(groupsFor("firstYear").map((g) => g.title)).toEqual([
      "Foundations",
      "Breadth",
      "Overlays",
      "Language",
      "Physical education",
      "Credits",
    ]);
  });

  test("every requirement lands in exactly one group", () => {
    const groups = groupsFor("firstYear");
    const ids = groups.flatMap((g) => g.rows.map((r) => r.result.requirementId));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("a group carries its requirement and its result together", () => {
    const breadth = groupsFor("firstYear").find((g) => g.title === "Breadth")!;
    expect(breadth.rows).toHaveLength(6);
    for (const row of breadth.rows) {
      expect(row.requirement.id).toBe(row.result.requirementId);
    }
  });
});

describe("what a student is shown", () => {
  test("a first-year does not see the transfer-only requirements at all", () => {
    const ids = groupsFor("firstYear").flatMap((g) => g.rows.map((r) => r.result.requirementId));

    expect(ids).toContain("physical-education");
    expect(ids).not.toContain("physical-education-transfer");
    expect(ids).not.toContain("post-matriculation-credits-transfer");
  });

  test("a transfer student sees the mirror image", () => {
    const ids = groupsFor("transfer").flatMap((g) => g.rows.map((r) => r.result.requirementId));

    expect(ids).toContain("physical-education-transfer");
    expect(ids).not.toContain("physical-education");
    expect(ids).not.toContain("post-matriculation-credits");
  });

  test("a transfer student STILL sees Critical Inquiry, waived, because being excused from it is information", () => {
    const foundations = groupsFor("transfer").find((g) => g.title === "Foundations")!;
    const ci = foundations.rows.find((r) => r.result.requirementId === "critical-inquiry");

    expect(ci).toBeDefined();
    expect(ci!.result.waived).toBe(true);
  });
});

describe("ordering inside a group", () => {
  test("what is still owed sorts above what is done", () => {
    const plan: StudentPlan = {
      ...planFor("firstYear"),
      completed: [
        { course: { department: "HIST", courseNumber: 101, suffix: "", affiliation: "PO" }, term: { year: 2025, term: "FA" }, grade: "A", gradeMode: "letter", provenance: "pomona" },
      ],
    };
    const breadth = groupRequirements(GE, evaluate(plan, [GE], CATALOG), plan).find((g) => g.title === "Breadth")!;
    const statuses = breadth.rows.map((r) => r.result.status);

    expect(statuses.indexOf("satisfied")).toBe(statuses.length - 1);
    expect(statuses[0]).toBe("unmet");
  });

  test("a waived row sorts last in its group", () => {
    const foundations = groupsFor("transfer").find((g) => g.title === "Foundations")!;
    expect(foundations.rows.at(-1)!.result.waived).toBe(true);
  });
});

describe("a program that is not general education", () => {
  test("unknown requirement ids still group, by rule kind, and nothing is lost", () => {
    const major: Program = {
      ...GE,
      id: "fake-major",
      requirements: [
        { ...GE.requirements[1]!, id: "major-course-a" },
        { ...GE.requirements[13]!, id: "major-credits" },
      ],
      constraints: [],
    };
    const plan = planFor("firstYear");
    const groups = groupRequirements(major, evaluate(plan, [major], CATALOG), plan);
    const ids = groups.flatMap((g) => g.rows.map((r) => r.result.requirementId));

    expect(ids).toEqual(["major-course-a", "major-credits"]);
    expect(groups.every((g) => g.title.length > 0)).toBe(true);
  });
});
