import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { writeArtefact } from "../src/write.ts";
import { PipelineError } from "../src/errors.ts";

const Schema = z.object({ n: z.number(), s: z.string() });
let dir: string;

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "gg-write-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe("writeArtefact", () => {
  test("writes a valid value as JSON", () => {
    const p = join(dir, "a.json");
    writeArtefact(p, { n: 1, s: "x" }, Schema);
    expect(JSON.parse(readFileSync(p, "utf8"))).toEqual({ n: 1, s: "x" });
  });

  test("refuses an invalid value and leaves no file behind", () => {
    const p = join(dir, "b.json");
    expect(() => writeArtefact(p, { n: "not a number", s: "x" }, Schema)).toThrow(PipelineError);
    expect(existsSync(p)).toBe(false);
    expect(readdirSync(dir)).toEqual([]);
  });

  test("leaves no temp file behind when validation rejects the value", () => {
    const p = join(dir, "c.json");
    expect(() => writeArtefact(p, { nope: true }, Schema)).toThrow();
    expect(readdirSync(dir).filter((f) => f.includes("tmp"))).toEqual([]);
  });

  test("removes the temp file when the WRITE itself fails", () => {
    // Schema validation happens first, so an invalid value returns before any
    // file is touched; that path never exercised the rmSync cleanup. Point the
    // destination at a directory so the rename fails after the temp file exists.
    const asDirectory = join(dir, "adir");
    mkdirSync(asDirectory, { recursive: true });
    expect(() => writeArtefact(asDirectory, { n: 1, s: "x" }, Schema)).toThrow(PipelineError);
    expect(readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  test("keeps the previous file untouched when the new value is invalid", () => {
    const p = join(dir, "d.json");
    writeFileSync(p, JSON.stringify({ n: 99, s: "yesterday" }));
    expect(() => writeArtefact(p, { n: "bad", s: "x" }, Schema)).toThrow();
    expect(JSON.parse(readFileSync(p, "utf8"))).toEqual({ n: 99, s: "yesterday" });
  });

  test("replaces an existing file atomically on success", () => {
    const p = join(dir, "e.json");
    writeFileSync(p, JSON.stringify({ n: 1, s: "old" }));
    writeArtefact(p, { n: 2, s: "new" }, Schema);
    expect(JSON.parse(readFileSync(p, "utf8"))).toEqual({ n: 2, s: "new" });
    expect(readdirSync(dir)).toEqual(["e.json"]);
  });

  test("creates missing parent directories", () => {
    const p = join(dir, "nested", "deep", "f.json");
    writeArtefact(p, { n: 3, s: "y" }, Schema);
    expect(existsSync(p)).toBe(true);
  });

  test("writes compact JSON for generated artefacts by default", () => {
    const p = join(dir, "g.json");
    writeArtefact(p, { n: 1, s: "x" }, Schema);
    expect(readFileSync(p, "utf8")).not.toContain("\n  ");
  });
});
