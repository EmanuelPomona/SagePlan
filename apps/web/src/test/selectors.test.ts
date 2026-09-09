import { describe, expect, test } from "vitest";
import { termCode } from "@gradguide/shared";
import type { CourseId, OfferingHistory, Result, Section, TermId } from "@gradguide/shared";
import { dualPurpose, offeredIn, ribbon } from "../candidates/selectors.ts";

const cid = (dept: string, n: number, aff = "PO"): CourseId => ({ department: dept, courseNumber: n, suffix: "", affiliation: aff });
const SP2027: TermId = { year: 2027, term: "SP" };

const section = (course: CourseId): Section => ({
  course, sectionNumber: 1, term: SP2027, half: null, instructors: ["Staff"],
  meetings: [], seatsTotal: 20, seatsFilled: 5, permCount: 0, status: "open", geCodes: [],
});

const result = (id: string, status: Result["status"], candidates: CourseId[]): Result => ({
  programId: "ge", requirementId: id, status, satisfiedBy: [], remaining: null,
  candidates, children: [],
});

describe("offeredIn", () => {
  test("keeps only candidates with at least one section this term", () => {
    const candidates = [cid("HIST", 101), cid("PHIL", 32), cid("CSCI", 51)];
    const sections = [section(cid("HIST", 101)), section(cid("CSCI", 51))];
    const map = offeredIn(candidates, sections);

    expect([...map.keys()].sort()).toEqual(["CSCI 051 PO", "HIST 101 PO"]);
    expect(map.get("HIST 101 PO")).toHaveLength(1);
  });

  test("groups several sections of the same course", () => {
    const map = offeredIn([cid("HIST", 101)], [section(cid("HIST", 101)), section(cid("HIST", 101))]);
    expect(map.get("HIST 101 PO")).toHaveLength(2);
  });

  test("no sections yields an empty map, never throws", () => {
    expect(offeredIn([cid("HIST", 101)], []).size).toBe(0);
  });
});

describe("dualPurpose", () => {
  const results = [
    result("area-3", "unmet", [cid("AMST", 110), cid("HIST", 101)]),
    result("analyzing-difference", "unmet", [cid("AMST", 110)]),
    result("area-1", "satisfied", [cid("AMST", 110)]),
    result("speaking-intensive", "partial", [cid("AMST", 110)]),
  ];

  test("names the other open requirements a course would also close", () => {
    expect(dualPurpose(cid("AMST", 110), results, "area-3").sort())
      .toEqual(["analyzing-difference", "speaking-intensive"]);
  });

  test("excludes the requirement being looked at", () => {
    expect(dualPurpose(cid("AMST", 110), results, "area-3")).not.toContain("area-3");
  });

  test("excludes requirements that are already satisfied", () => {
    expect(dualPurpose(cid("AMST", 110), results, "area-3")).not.toContain("area-1");
  });

  test("a course that closes nothing else returns an empty list", () => {
    expect(dualPurpose(cid("HIST", 101), results, "area-3")).toEqual([]);
  });
});

describe("ribbon", () => {
  const known: TermId[] = [
    { year: 2023, term: "SP" }, { year: 2023, term: "FA" },
    { year: 2024, term: "SP" }, { year: 2024, term: "FA" },
    { year: 2025, term: "SP" }, { year: 2025, term: "FA" },
    { year: 2026, term: "SP" }, { year: 2026, term: "FA" },
    { year: 2027, term: "SP" },
  ];

  test("returns exactly n entries, the most recent, ascending", () => {
    const out = ribbon(cid("HIST", 101), [], known, 8);

    expect(out).toHaveLength(8);
    expect(out.map((c) => termCode(c.term))).toEqual(["FA2023", "SP2024", "FA2024", "SP2025", "FA2025", "SP2026", "FA2026", "SP2027"]);
  });

  test("marks the terms the course actually ran", () => {
    const history: OfferingHistory[] = [
      { course: cid("HIST", 101), terms: [{ year: 2025, term: "FA" }, { year: 2026, term: "FA" }] },
    ];
    const out = ribbon(cid("HIST", 101), history, known, 8);
    const offered = out.filter((c) => c.offered).map((c) => termCode(c.term));

    expect(offered).toEqual(["FA2025", "FA2026"]);
  });

  test("a course absent from history is all hollow, never throws", () => {
    const out = ribbon(cid("ZZZZ", 999), [{ course: cid("HIST", 101), terms: known }], known, 8);
    expect(out).toHaveLength(8);
    expect(out.every((c) => !c.offered)).toBe(true);
  });

  test("fewer known terms than requested yields what exists", () => {
    expect(ribbon(cid("HIST", 101), [], known.slice(0, 3), 8)).toHaveLength(3);
  });

  test("no known terms yields an empty ribbon", () => {
    expect(ribbon(cid("HIST", 101), [], [], 8)).toEqual([]);
  });
});
