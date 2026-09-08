import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SectionsArtefactSchema, OfferingHistoryArtefactSchema, CatalogArtefactSchema, courseKey, compareTerms, type Course } from "@gradguide/shared";
import { runSections } from "../../src/commands/sections.ts";
import { runHistory } from "../../src/commands/history.ts";
import { PipelineError } from "../../src/errors.ts";
import { readEnv } from "../../src/env.ts";

const sectionsFixture = JSON.parse(readFileSync(new URL("../fixtures/hs-sections-sample.json", import.meta.url), "utf8"));
const historyFixture = JSON.parse(readFileSync(new URL("../fixtures/hs-history-sample.json", import.meta.url), "utf8"));
const termsFixture = JSON.parse(readFileSync(new URL("../fixtures/hs-terms.json", import.meta.url), "utf8"));

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "gg-sections-")); mkdirSync(join(dir, "data"), { recursive: true }); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const env = () => readEnv({ PIPELINE_DATA_DIR: join(dir, "data") });
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

const poCourse: Course = {
  id: { department: "AFRI", courseNumber: 10, suffix: "A", affiliation: "PO" },
  title: "A Pomona course from Coursedog", description: "Full description", department: "AFRI",
  credits: { min: 1, max: 1, repeatable: false, maxRepeats: 0 }, attributes: ["AREA_3"],
  gradeMode: "LP", prereqText: null, prereqRule: null, catalogYear: "2026-2027",
  sourceUrl: "https://catalog.pomona.edu/courses/x", lastVerified: "2026-09-01T00:00:00Z",
};
const seedCatalog = (courses: Course[]) => writeFileSync(join(dir, "data", "catalog.json"), JSON.stringify({
  meta: { schemaVersion: 1, generator: "seed", generatedAt: "2026-09-01T00:00:00Z", fetchedAt: "2026-09-01T00:00:00Z", sourceUrl: "https://x.test/s", catalogYear: "2026-2027" },
  courses,
}));

describe("runSections", () => {
  test("writes a valid SectionsArtefact per requested term", async () => {
    seedCatalog([poCourse]);
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(json(sectionsFixture)));
    await runSections(["FA2026"], { env: env(), fetchImpl, minSections: 1 });
    const artefact = JSON.parse(readFileSync(join(dir, "data", "sections-FA2026.json"), "utf8"));
    expect(SectionsArtefactSchema.safeParse(artefact).success).toBe(true);
    expect(artefact.term).toEqual({ year: 2026, term: "FA" });
  });

  test("throws and writes nothing when a term returns zero sections", async () => {
    seedCatalog([poCourse]);
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(json([])));
    const err = await runSections(["FA2026"], { env: env(), fetchImpl, minSections: 1 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PipelineError);
    expect(existsSync(join(dir, "data", "sections-FA2026.json"))).toBe(false);
  });

  test("rejects a term code that is not FA/SP + year", async () => {
    seedCatalog([poCourse]);
    await expect(runSections(["SU2026"], { env: env(), fetchImpl: vi.fn(), minSections: 1 })).rejects.toBeInstanceOf(PipelineError);
  });

  test("merges non-Pomona courses seen in sections into the catalog", async () => {
    seedCatalog([poCourse]);
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(json(sectionsFixture)));
    await runSections(["FA2026"], { env: env(), fetchImpl, minSections: 1 });
    const catalog = CatalogArtefactSchema.parse(JSON.parse(readFileSync(join(dir, "data", "catalog.json"), "utf8")));
    expect(catalog.courses.some((c) => c.id.affiliation !== "PO")).toBe(true);
  });

  test("never overwrites a Pomona course that came from Coursedog", async () => {
    seedCatalog([poCourse]);
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(json(sectionsFixture)));
    await runSections(["FA2026"], { env: env(), fetchImpl, minSections: 1 });
    const catalog = CatalogArtefactSchema.parse(JSON.parse(readFileSync(join(dir, "data", "catalog.json"), "utf8")));
    const kept = catalog.courses.find((c) => courseKey(c.id) === "AFRI 010A PO")!;
    expect(kept.title).toBe(poCourse.title);
    expect(kept.description).toBe("Full description");
  });

  test("leaves every existing PO course byte-identical after the merge", async () => {
    seedCatalog([poCourse]);
    const before = JSON.stringify(poCourse);
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(json(sectionsFixture)));
    await runSections(["FA2026"], { env: env(), fetchImpl, minSections: 1 });
    const catalog = CatalogArtefactSchema.parse(JSON.parse(readFileSync(join(dir, "data", "catalog.json"), "utf8")));
    expect(JSON.stringify(catalog.courses.find((c) => courseKey(c.id) === "AFRI 010A PO"))).toBe(before);
  });

  test("writes one file per term when given several", async () => {
    seedCatalog([poCourse]);
    // Each term must return sections filed under THAT term; normaliseSection
    // rejects a section whose identifier disagrees with the term requested.
    const forTerm = (code: string) => {
      const term = code.slice(0, 2), year = Number(code.slice(2));
      return structuredClone(sectionsFixture).map((s: { identifier: Record<string, unknown> }) => {
        s.identifier.term = term; s.identifier.year = year; return s;
      });
    };
    const fetchImpl = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(json(forTerm(url.includes("SP2027") ? "SP2027" : "FA2026"))));
    await runSections(["FA2026", "SP2027"], { env: env(), fetchImpl, minSections: 1 });
    expect(existsSync(join(dir, "data", "sections-FA2026.json"))).toBe(true);
    expect(existsSync(join(dir, "data", "sections-SP2027.json"))).toBe(true);
  });
});

describe("runHistory", () => {
  test("writes a valid OfferingHistoryArtefact with ascending knownTerms", async () => {
    const fetchImpl = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(json(url.includes("term/all") ? termsFixture : historyFixture)));
    await runHistory(["FA2026"], { env: env(), fetchImpl, minCourses: 1 });
    const artefact = OfferingHistoryArtefactSchema.parse(JSON.parse(readFileSync(join(dir, "data", "offering-history.json"), "utf8")));
    for (let i = 1; i < artefact.knownTerms.length; i++) {
      expect(compareTerms(artefact.knownTerms[i - 1]!, artefact.knownTerms[i]!)).toBeLessThan(0);
    }
  });

  test("knownTerms contains every term any course was offered in", async () => {
    const fetchImpl = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(json(url.includes("term/all") ? termsFixture : historyFixture)));
    await runHistory(["FA2026"], { env: env(), fetchImpl, minCourses: 1 });
    const a = OfferingHistoryArtefactSchema.parse(JSON.parse(readFileSync(join(dir, "data", "offering-history.json"), "utf8")));
    for (const h of a.history) {
      for (const t of h.terms) {
        expect(a.knownTerms.some((k) => k.year === t.year && k.term === t.term)).toBe(true);
      }
    }
  });

  test("throws and writes nothing on an empty history", async () => {
    const fetchImpl = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(json(url.includes("term/all") ? termsFixture : [])));
    await expect(runHistory(["FA2026"], { env: env(), fetchImpl, minCourses: 1 })).rejects.toBeInstanceOf(PipelineError);
    expect(existsSync(join(dir, "data", "offering-history.json"))).toBe(false);
  });
});

describe("runSections when a term is not published yet", () => {
  test("skips a 404 term with a warning and still merges the others", async () => {
    seedCatalog([poCourse]);
    const fetchImpl = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(url.includes("SP2027") ? new Response("", { status: 404 }) : json(sectionsFixture)));
    await runSections(["FA2026", "SP2027"], { env: env(), fetchImpl, minSections: 1 });
    expect(existsSync(join(dir, "data", "sections-FA2026.json"))).toBe(true);
    expect(existsSync(join(dir, "data", "sections-SP2027.json"))).toBe(false);
  });

  test("fails when no requested term is published", async () => {
    seedCatalog([poCourse]);
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(new Response("", { status: 404 })));
    const err = await runSections(["SP2027"], { env: env(), fetchImpl, minSections: 1 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PipelineError);
    expect((err as PipelineError).code).toBe("SECTIONS_NO_TERMS");
  });

  test("still fails hard when a published term returns zero sections", async () => {
    seedCatalog([poCourse]);
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(json([])));
    const err = await runSections(["FA2026"], { env: env(), fetchImpl, minSections: 1 }).catch((e: unknown) => e);
    expect((err as PipelineError).code).toBe("SECTIONS_EMPTY");
  });
});
