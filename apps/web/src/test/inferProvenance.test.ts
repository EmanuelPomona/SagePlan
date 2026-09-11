import { describe, expect, test } from "vitest";
import { parseCourseKey } from "@gradguide/shared";
import { provenanceFor } from "../record/inferProvenance.ts";

const of = (key: string) => provenanceFor(parseCourseKey(key)!);

describe("provenance is read off the campus code, never asked for", () => {
  test("a Pomona course is Pomona work", () => {
    expect(of("CSCI 051 PO")).toBe("pomona");
  });

  test.each(["PSYC 052 SC", "CSCI 005 HM", "ECON 101 CM", "ANTH 010 PZ"])(
    "%s is cross-registration at another Claremont college",
    (key) => {
      expect(of(key)).toBe("claremont");
    },
  );

  test("an EXT course came from outside, which is the only case a human has to answer", () => {
    expect(of("ECON 101 EXT")).toBe("transfer");
  });
});
