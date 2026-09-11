import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { parseRegistrarCsv, parseRegistrarCsvDetailed, decodeUtf16 } from "../../src/registrar/parseCsv.ts";
import { fromRepoRoot } from "../../src/env.ts";
import { PipelineError } from "../../src/errors.ts";

const fixtureBuf = readFileSync(new URL("../fixtures/registrar-sample.csv", import.meta.url));

describe("decodeUtf16", () => {
  test("decodes UTF-16 LE and strips the byte-order mark", () => {
    const text = decodeUtf16(Buffer.from("﻿hello", "utf16le"));
    expect(text).toBe("hello");
    expect(text.charCodeAt(0)).not.toBe(0xfeff);
  });

  test("throws a PipelineError on a buffer that is not UTF-16", () => {
    expect(() => decodeUtf16(Buffer.from([0x00]))).toThrow(PipelineError);
  });
});

describe("parseRegistrarCsv", () => {
  const rows = parseRegistrarCsv(fixtureBuf);

  test("returns one object per data row", () => {
    expect(rows.length).toBe(205);
  });

  test("reads the seven documented columns", () => {
    expect(Object.keys(rows[0]!)).toEqual(
      expect.arrayContaining(["courseNumber", "courseTitle", "breadthArea", "measureName", "breadthAreaDescription", "language", "measureValue"]),
    );
  });

  test("splits on tabs, so a comma inside a title survives", () => {
    const withComma = rows.find((r) => r.courseTitle.includes(","));
    if (withComma) expect(withComma.courseTitle).toContain(",");
    expect(rows.every((r) => !r.courseNumber.includes("\t"))).toBe(true);
  });

  test("parses measureValue as a number", () => {
    expect(rows.every((r) => Number.isFinite(r.measureValue))).toBe(true);
  });

  test("keeps every documented measure name", () => {
    expect(new Set(rows.map((r) => r.measureName))).toEqual(
      new Set(["Analyzing Difference", "Language Requirement", "Physical Education", "Speaking Intensive", "Writing Intensive"]),
    );
  });

  test("ignores the trailing blank line", () => {
    expect(rows.every((r) => r.courseNumber.trim().length > 0)).toBe(true);
  });

  test("throws when the header is not the expected export", () => {
    expect(() => parseRegistrarCsv(Buffer.from("﻿a\tb\r\n1\t2\r\n", "utf16le"))).toThrow(PipelineError);
  });
});

describe("Measure Values is 0, 1 or 2 — not 0/1 as the task spec says", () => {
  test("a value of 2 is preserved, not clamped", () => {
    // All nineteen 2s in the committed export are Physical Education on
    // full-credit dance/PE courses, and AC-B02's PE count of 241 only holds
    // because pivot treats >= 1 as present. Nothing named this case before.
    const csv = Buffer.from(
      "﻿Course Number\tCourse Title\tBreadth Area\tMeasure Names\tBreadth Area Description\tLanguage\tMeasure Values\r\n"
      + "DANC012 PPO\tBallet\t \tPhysical Education\t \tFalse\t2\r\n", "utf16le");
    expect(parseRegistrarCsv(csv)[0]!.measureValue).toBe(2);
  });

  test("a garbled value is coerced to absent AND counted", () => {
    const csv = Buffer.from(
      "﻿Course Number\tCourse Title\tBreadth Area\tMeasure Names\tBreadth Area Description\tLanguage\tMeasure Values\r\n"
      + "DANC012 PPO\tBallet\t \tPhysical Education\t \tFalse\tnot-a-number\r\n", "utf16le");
    const r = parseRegistrarCsvDetailed(csv);
    expect(r.rows[0]!.measureValue).toBe(0);
    expect(r.garbledMeasureValues).toEqual(["not-a-number"]);
  });

  test("the committed export contains no garbled value", () => {
    const r = parseRegistrarCsvDetailed(readFileSync(fromRepoRoot("data/sources/registrar-ge-export-2026-09-08.csv")));
    expect(r.garbledMeasureValues).toEqual([]);
  });

  test("the committed export contains exactly nineteen value-2 rows, all Physical Education", () => {
    const rows = parseRegistrarCsv(readFileSync(fromRepoRoot("data/sources/registrar-ge-export-2026-09-08.csv")));
    const twos = rows.filter((r) => r.measureValue === 2);
    expect(twos).toHaveLength(19);
    expect(new Set(twos.map((r) => r.measureName))).toEqual(new Set(["Physical Education"]));
  });
});
