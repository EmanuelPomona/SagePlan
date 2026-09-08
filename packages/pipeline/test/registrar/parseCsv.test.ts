import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { parseRegistrarCsv, decodeUtf16 } from "../../src/registrar/parseCsv.ts";
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
