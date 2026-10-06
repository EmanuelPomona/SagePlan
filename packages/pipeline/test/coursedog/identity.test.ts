import { describe, expect, test } from "vitest";
import { courseKey } from "@sageplan/shared";
import { courseIdFromRaw } from "../../src/coursedog/identity.ts";

const key = (subject?: string, code?: string, num?: string) => {
  const id = courseIdFromRaw(subject, code, num);
  return id === null ? null : courseKey(id);
};

describe("courseIdFromRaw", () => {
  test("decomposes the spaced form", () => {
    expect(key("AKP", "AKP 005 PO", "005 PO")).toBe("AKP 005 PO");
  });

  test("decomposes the unspaced form Coursedog usually writes", () => {
    expect(key("POLI", "POLI134 PO", "134 PO")).toBe("POLI 134 PO");
  });

  test("splits a suffix glued to the affiliation", () => {
    expect(key("CHEM", "CHEM001ALPO", "001ALPO")).toBe("CHEM 001AL PO");
  });

  test("keeps a letter suffix out of the number", () => {
    expect(key("POLI", "POLI190D PO", "190D PO")).toBe("POLI 190D PO");
  });

  test("defaults to PO when the code carries no affiliation", () => {
    expect(key("THEA", "THEA089D", "089D")).toBe("THEA 089D PO");
  });

  // Coursedog's `code` and `subjectCode` genuinely disagree for some records, so
  // the courseNumber fallback is a real path — and in THIS catalog courseNumber
  // carries the affiliation too ("033 PO"). Both must strip it.
  test("strips the affiliation on the courseNumber fallback path", () => {
    // { code: "LATN033 PO", subjectCode: "CLAS" } is a real record.
    expect(key("CLAS", "LATN033 PO", "033 PO")).toBe("CLAS 033 PO");
  });

  test("handles a code whose department disagrees with the subject code", () => {
    // { code: "DS 190 PO", subjectCode: "ID" } is a real record.
    expect(key("ID", "DS 190 PO", "190 PO")).toBe("ID 190 PO");
  });

  test("keeps a glued suffix on the fallback path", () => {
    // { code: "JPNT199DRPO", subjectCode: "JAPN" } is a real record.
    expect(key("JAPN", "JPNT199DRPO", "199DRPO")).toBe("JAPN 199DR PO");
  });

  test("still reads the affiliation when it comes from the code", () => {
    expect(key("PE", "PE 095AA JP", "095AA JP")).toBe("PE 095AA JP");
  });

  // The bug this guards: a loose suffix pattern turned a four-digit number into
  // a three-digit number plus a digit suffix, and courseNumber drives the
  // 190-199 senior-exercise rule.
  test("refuses a four-digit course number rather than inventing a suffix", () => {
    expect(key("MATH", "MATH1000", "1000")).toBeNull();
    expect(key("HIST", "HIST0101 PO", "0101 PO")).toBeNull();
  });

  test("rejects a record with no usable subject code", () => {
    expect(key(undefined, "PE WAIVER", undefined)).toBeNull();
    expect(key("", "", "")).toBeNull();
  });

  test("rejects a course range", () => {
    expect(key("MUS", "MUS031-042PO", "031-042PO")).toBeNull();
  });
});
