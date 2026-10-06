import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ManifestSchema, compareTerms, parseTermCode } from "@sageplan/shared";
import { runManifest } from "../../src/commands/manifest.ts";
import { runAll, defaultSteps, assertNoFailures, type Step } from "../../src/commands/all.ts";
import { PipelineError } from "../../src/errors.ts";
import { readEnv } from "../../src/env.ts";

let dir: string, data: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "gg-man-")); data = join(dir, "data"); mkdirSync(join(data, "programs"), { recursive: true }); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const env = (terms = "FA2026,SP2027") => readEnv({ PIPELINE_DATA_DIR: data, PIPELINE_TERMS: terms });
const meta = { schemaVersion: 1, generator: "t", generatedAt: "2026-09-08T00:00:00Z", fetchedAt: "2026-09-08T00:00:00Z", sourceUrl: "https://x.test/a", catalogYear: "2026-2027" };
const course = { id: { department: "CSCI", courseNumber: 51, suffix: "", affiliation: "PO" }, title: "T", description: "", department: "CSCI", credits: { min: 1, max: 1, repeatable: false, maxRepeats: 0 }, attributes: [], gradeMode: "", prereqText: null, prereqRule: null, catalogYear: "2026-2027", sourceUrl: "https://catalog.pomona.edu/x", lastVerified: "2026-09-08T00:00:00Z" };
const section = (year: number, term: string) => ({ course: course.id, sectionNumber: 1, term: { year, term }, half: null, instructors: [], meetings: [], seatsTotal: 1, seatsFilled: 0, permCount: 0, status: "O", geCodes: [] });

const seed = (terms: [number, string][] = [[2026, "FA"]]) => {
  writeFileSync(join(data, "catalog.json"), JSON.stringify({ meta, courses: [course] }));
  writeFileSync(join(data, "external-credit-rules.json"), JSON.stringify({ schemaVersion: 1 }));
  writeFileSync(join(data, "programs", "general-education-2026.json"), JSON.stringify({ id: "general-education-2026", kind: "general-education", name: "GE", confidence: "verified" }));
  for (const [year, t] of terms) {
    writeFileSync(join(data, `sections-${t}${year}.json`), JSON.stringify({ meta, term: { year, term: t }, sections: [section(year, t)] }));
  }
};

describe("runManifest", () => {
  test("lists what is on disk with correct counts", async () => {
    seed();
    const m = await runManifest([], { env: env() });
    expect(ManifestSchema.safeParse(m).success).toBe(true);
    expect(m.catalog.courseCount).toBe(1);
    expect(m.sections).toHaveLength(1);
    expect(m.programs).toHaveLength(1);
  });

  test("omits a configured term that has no sections file", async () => {
    seed([[2026, "FA"]]);
    const m = await runManifest([], { env: env("FA2026,SP2027") });
    expect(m.upcomingTerms).toEqual(["FA2026"]);
  });

  test("orders upcomingTerms ascending", async () => {
    seed([[2027, "SP"], [2026, "FA"]]);
    const m = await runManifest([], { env: env("SP2027,FA2026") });
    expect(m.upcomingTerms).toEqual(["FA2026", "SP2027"]);
    for (let i = 1; i < m.upcomingTerms.length; i++) {
      expect(compareTerms(parseTermCode(m.upcomingTerms[i - 1]!)!, parseTermCode(m.upcomingTerms[i]!)!)).toBeLessThan(0);
    }
  });

  test("writes manifest.json to disk", async () => {
    seed();
    await runManifest([], { env: env() });
    expect(ManifestSchema.safeParse(JSON.parse(readFileSync(join(data, "manifest.json"), "utf8"))).success).toBe(true);
  });

  test("throws when the catalog is missing", async () => {
    await expect(runManifest([], { env: env() })).rejects.toBeInstanceOf(PipelineError);
  });

  test("records offeringHistory as null when there is none", async () => {
    seed();
    expect((await runManifest([], { env: env() })).offeringHistory).toBeNull();
  });
});

describe("runAll", () => {
  const step = (name: string, fn: () => Promise<unknown>): Step => ({ name, run: fn });

  test("runs every step in order when all succeed", async () => {
    const order: string[] = [];
    const steps = ["catalog", "sections", "history", "validate", "manifest"].map((n) =>
      step(n, async () => { order.push(n); }));
    await runAll([], { env: env(), steps });
    expect(order).toEqual(["catalog", "sections", "history", "validate", "manifest"]);
  });

  test("stops at the first failure and never reaches manifest", async () => {
    const order: string[] = [];
    const steps = [
      step("catalog", async () => { order.push("catalog"); }),
      step("sections", async () => { throw new PipelineError("boom", "SECTIONS_EMPTY"); }),
      step("history", async () => { order.push("history"); }),
      step("manifest", async () => { order.push("manifest"); }),
    ];
    await expect(runAll([], { env: env(), steps })).rejects.toBeInstanceOf(PipelineError);
    expect(order).toEqual(["catalog"]);
  });

  test("names the failing step in the error", async () => {
    const steps = [step("sections", async () => { throw new PipelineError("boom", "X"); })];
    const err = await runAll([], { env: env(), steps }).catch((e: unknown) => e);
    expect((err as PipelineError).message).toContain("sections");
  });

  test("prints a summary table naming the failing step", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const steps = [
      step("catalog", async () => {}),
      step("sections", async () => { throw new PipelineError("boom", "SECTIONS_EMPTY"); }),
      step("manifest", async () => {}),
    ];
    await runAll([], { env: env(), steps }).catch(() => {});
    const printed = log.mock.calls.map((c) => String(c[0])).join("\n");
    log.mockRestore();
    expect(printed).toContain("sections");
    expect(printed).toContain("failed");
    expect(printed).toContain("skipped");
  });
});

describe("runAll failure enforcement", () => {
  test("a failing validate step stops the run before manifest is written", async () => {
    const order: string[] = [];
    const steps: Step[] = [
      { name: "validate", run: async () => { order.push("validate"); throw new PipelineError("2 validators failed", "VALIDATION_FAILED"); } },
      { name: "manifest", run: async () => { order.push("manifest"); } },
      { name: "verify", run: async () => { order.push("verify"); } },
    ];
    await expect(runAll([], { env: env(), steps })).rejects.toBeInstanceOf(PipelineError);
    expect(order).toEqual(["validate"]);
  });

  test("a failing final verify step fails the whole run", async () => {
    const steps: Step[] = [
      { name: "manifest", run: async () => {} },
      { name: "verify", run: async () => { throw new PipelineError("inconsistent", "MANIFEST_INCONSISTENT"); } },
    ];
    const err = await runAll([], { env: env(), steps }).catch((e: unknown) => e);
    expect((err as PipelineError).message).toContain("verify");
  });
});

describe("the REAL default step list", () => {
  // Every other runAll test injects fake steps, which only ever proved that a
  // for-loop stops on a throw. These assert the actual sequence and the actual
  // failure enforcement.
  test("runs catalog, sections, history, validate, manifest, then verify", () => {
    expect(defaultSteps(env()).map((s) => s.name)).toEqual(
      ["catalog", "sections", "history", "validate", "manifest", "verify"],
    );
  });

  test("writes the manifest only after validation", () => {
    const names = defaultSteps(env()).map((s) => s.name);
    expect(names.indexOf("validate")).toBeLessThan(names.indexOf("manifest"));
  });

  test("verifies the manifest after writing it", () => {
    const names = defaultSteps(env()).map((s) => s.name);
    expect(names.indexOf("manifest")).toBeLessThan(names.indexOf("verify"));
  });
});

describe("assertNoFailures", () => {
  const check = (id: string, status: "pass" | "warn" | "fail") => ({ id, status, summary: `${id} summary`, count: 0, details: [] });

  test("passes when every check passed", () => {
    expect(() => assertNoFailures([check("a", "pass"), check("b", "pass")])).not.toThrow();
  });

  test("passes on warnings: they are advisory by contract", () => {
    expect(() => assertNoFailures([check("ge-agreement", "warn")])).not.toThrow();
  });

  test("throws on a single hard failure and names the validator", () => {
    try {
      assertNoFailures([check("manifest", "fail")]);
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as PipelineError).code).toBe("VALIDATION_FAILED");
      expect((e as PipelineError).message).toContain("manifest");
    }
  });

  test("names every failing validator", () => {
    const err = (() => { try { assertNoFailures([check("a", "fail"), check("b", "fail")]); } catch (e) { return e as PipelineError; } })()!;
    expect(err.message).toContain("a");
    expect(err.message).toContain("b");
    expect(err.message).toContain("2 validator(s)");
  });

  test("passes on an empty check list", () => {
    expect(() => assertNoFailures([])).not.toThrow();
  });
});
