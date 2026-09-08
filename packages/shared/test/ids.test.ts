import { describe, expect, it } from "vitest";
import { compareTerms, courseKey, parseCourseKey, parseTermCode, termCode } from "../src/index.ts";

describe("courseKey / parseCourseKey", () => {
  it("round-trips a course with a suffix", () => {
    const id = { department: "CSCI", courseNumber: 62, suffix: "A", affiliation: "PO" };
    expect(courseKey(id)).toBe("CSCI 062A PO");
    expect(parseCourseKey("CSCI 062A PO")).toEqual(id);
  });
  it("zero-pads and handles two-letter departments", () => {
    expect(courseKey({ department: "ID", courseNumber: 1, suffix: "", affiliation: "PO" })).toBe("ID 001 PO");
    expect(parseCourseKey("id 1 po")).toEqual({ department: "ID", courseNumber: 1, suffix: "", affiliation: "PO" });
  });
  it("rejects garbage", () => {
    expect(parseCourseKey("")).toBeNull();
    expect(parseCourseKey("CSCI PO")).toBeNull();
    expect(parseCourseKey("CSCI 62")).toBeNull();
  });
});

describe("termCode / compareTerms", () => {
  it("round-trips", () => {
    expect(termCode({ year: 2026, term: "FA" })).toBe("FA2026");
    expect(parseTermCode("sp2027")).toEqual({ year: 2027, term: "SP" });
    expect(parseTermCode("SU2026")).toBeNull();
  });
  it("orders chronologically: SP2026 < FA2026 < SP2027", () => {
    const sp26 = { year: 2026, term: "SP" as const }, fa26 = { year: 2026, term: "FA" as const }, sp27 = { year: 2027, term: "SP" as const };
    expect(compareTerms(sp26, fa26)).toBeLessThan(0);
    expect(compareTerms(fa26, sp27)).toBeLessThan(0);
    expect(compareTerms(fa26, fa26)).toBe(0);
  });
});
