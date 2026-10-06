import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { courseKey } from "@sageplan/shared";
import { parseCoursedogCsv, parseCsvRows } from "../../src/coursedog/csvFallback.ts";
import { normaliseAll } from "../../src/coursedog/normalise.ts";
import { dedupeCourses } from "../../src/coursedog/dedupe.ts";

const CTX = { catalogYear: "2026-2027" as const, fetchedAt: "2026-09-08T12:00:00Z" };
const csvText = readFileSync(new URL("../fixtures/coursedog-sample.csv", import.meta.url), "utf8");
const json = JSON.parse(
  readFileSync(new URL("../fixtures/coursedog-sample.json", import.meta.url), "utf8"),
) as { data: Record<string, unknown>[] };

describe("parseCsvRows", () => {
  test("splits simple rows", () => {
    expect(parseCsvRows("a,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  test("keeps a comma inside a quoted field", () => {
    expect(parseCsvRows('a,b\r\n"x, y",2\r\n')[1]).toEqual(["x, y", "2"]);
  });

  test("unescapes a doubled quote", () => {
    expect(parseCsvRows('a\r\n"say ""hi"""\r\n')[1]).toEqual(['say "hi"']);
  });

  test("keeps a newline inside a quoted field", () => {
    expect(parseCsvRows('a,b\r\n"line1\nline2",2\r\n')[1]).toEqual(["line1\nline2", "2"]);
  });

  test("ignores a trailing blank line", () => {
    expect(parseCsvRows("a\r\n1\r\n\r\n")).toEqual([["a"], ["1"]]);
  });
});

describe("parseCoursedogCsv", () => {
  test("returns one raw record per data row", () => {
    expect(parseCoursedogCsv(csvText)).toHaveLength(json.data.length);
  });

  test("recovers the structured credit shape", () => {
    const pe = parseCoursedogCsv(csvText).find((r) => r.code === "PE 175W PO")!;
    expect(pe.credits?.creditHours?.min).toBe(0.25);
    expect(pe.credits?.creditHours?.max).toBe(0.25);
  });

  test("splits the attributes column back into entries", () => {
    const r = parseCoursedogCsv(csvText).find((c) => c.code === "POLI177 PO")!;
    expect((r.attributes ?? []).join(" ")).toContain("PO Area 2 Requirement");
  });

  test("preserves status so the Active filter still applies", () => {
    const rows = parseCoursedogCsv(csvText);
    expect(rows.filter((r) => r.status === "Active").length).toBe(json.data.filter((r) => r.status === "Active").length);
  });

  test("yields the same PO course set as the JSON payload", () => {
    const fromCsv = dedupeCourses(normaliseAll(parseCoursedogCsv(csvText), CTX).courses).courses;
    const fromJson = dedupeCourses(normaliseAll(json.data, CTX).courses).courses;
    const keys = (cs: { id: Parameters<typeof courseKey>[0] }[]) => cs.map((c) => courseKey(c.id)).sort();
    expect(keys(fromCsv)).toEqual(keys(fromJson));
  });

  test("produces courses identical to the JSON payload's except for prereqText", () => {
    // The catalog UI export carries no requisites column, so prereqText is the
    // one field it cannot reproduce. Every other field must match exactly.
    const norm = (rows: Record<string, unknown>[]) =>
      dedupeCourses(normaliseAll(rows, CTX).courses)
        .courses.slice()
        .sort((a, b) => courseKey(a.id).localeCompare(courseKey(b.id)));
    const fromCsv = norm(parseCoursedogCsv(csvText) as Record<string, unknown>[]);
    const fromJson = norm(json.data);
    expect(fromCsv.map((c) => ({ ...c, prereqText: null }))).toEqual(
      fromJson.map((c) => ({ ...c, prereqText: null })),
    );
  });

  test("prereqText is the only field the CSV path cannot reproduce", () => {
    const norm = (rows: Record<string, unknown>[]) =>
      dedupeCourses(normaliseAll(rows, CTX).courses)
        .courses.slice()
        .sort((a, b) => courseKey(a.id).localeCompare(courseKey(b.id)));
    const fromCsv = norm(parseCoursedogCsv(csvText) as Record<string, unknown>[]);
    const fromJson = norm(json.data);
    const differing = new Set<string>();
    for (let i = 0; i < fromJson.length; i++) {
      for (const field of Object.keys(fromJson[i]!) as (keyof (typeof fromJson)[number])[]) {
        if (JSON.stringify(fromCsv[i]![field]) !== JSON.stringify(fromJson[i]![field])) differing.add(String(field));
      }
    }
    expect([...differing]).toEqual(["prereqText"]);
  });

  test("throws on a CSV with no recognisable course-code column", () => {
    expect(() => parseCoursedogCsv("foo,bar\r\n1,2\r\n")).toThrow();
  });
});
