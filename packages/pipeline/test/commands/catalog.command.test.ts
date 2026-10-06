import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CatalogArtefactSchema, courseKey, type Course } from "@sageplan/shared";
import { runCatalog } from "../../src/commands/catalog.ts";
import { PipelineError } from "../../src/errors.ts";
import { readEnv } from "../../src/env.ts";

const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/coursedog-sample.json", import.meta.url), "utf8"),
) as { data: unknown[] };

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "gg-catalog-")); mkdirSync(join(dir, "data"), { recursive: true }); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const env = (over: Record<string, string> = {}) => readEnv({ PIPELINE_DATA_DIR: join(dir, "data"), ...over });
const catalogPath = () => join(dir, "data", "catalog.json");
const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

const fakeHm: Course = {
  id: { department: "CSCI", courseNumber: 5, suffix: "", affiliation: "HM" },
  title: "Introduction to Computer Science (Harvey Mudd)",
  description: "",
  department: "CSCI",
  credits: { min: 3, max: 3, repeatable: false, maxRepeats: 0 },
  attributes: ["AREA_5"],
  gradeMode: "",
  prereqText: null,
  prereqRule: null,
  catalogYear: "2026-2027",
  sourceUrl: "https://hyperschedule.io/",
  lastVerified: "2026-09-01T00:00:00Z",
};

const seedCatalogWith = (courses: Course[]) => {
  writeFileSync(catalogPath(), JSON.stringify({
    meta: {
      schemaVersion: 1, generator: "seed", generatedAt: "2026-09-01T00:00:00Z",
      fetchedAt: "2026-09-01T00:00:00Z", sourceUrl: "https://example.test/seed", catalogYear: "2026-2027",
    },
    courses,
  }));
};

describe("runCatalog", () => {
  test("writes a valid CatalogArtefact from a successful fetch", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ listLength: fixture.data.length, data: fixture.data }));
    await runCatalog([], { env: env(), fetchImpl, minPoCourses: 1 });
    const artefact = JSON.parse(readFileSync(catalogPath(), "utf8"));
    expect(CatalogArtefactSchema.safeParse(artefact).success).toBe(true);
    expect(artefact.courses.length).toBeGreaterThan(0);
  });

  test("sends the Origin header Coursedog requires", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: fixture.data }));
    await runCatalog([], { env: env(), fetchImpl, minPoCourses: 1 });
    const init = fetchImpl.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Origin).toBe("https://catalog.pomona.edu");
  });

  test("throws on HTTP 401 and writes nothing", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{"error":"Unauthenticated"}', { status: 401 }));
    const err = await runCatalog([], { env: env({ COURSEDOG_ORIGIN: "https://wrong.example" }), fetchImpl, minPoCourses: 1 })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PipelineError);
    expect((err as PipelineError).status).toBe(401);
    expect(existsSync(catalogPath())).toBe(false);
  });

  test("keeps yesterday's catalog untouched when the fetch 401s", async () => {
    seedCatalogWith([fakeHm]);
    const before = readFileSync(catalogPath(), "utf8");
    const fetchImpl = vi.fn().mockResolvedValue(new Response("no", { status: 401 }));
    await runCatalog([], { env: env(), fetchImpl, minPoCourses: 1 }).catch(() => {});
    expect(readFileSync(catalogPath(), "utf8")).toBe(before);
  });

  test("throws when the fetch returns zero courses, and writes nothing", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ listLength: 0, data: [] }));
    const err = await runCatalog([], { env: env(), fetchImpl, minPoCourses: 1 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PipelineError);
    expect((err as PipelineError).code).toBe("CATALOG_EMPTY");
    expect(existsSync(catalogPath())).toBe(false);
  });

  test("throws when the course count is below the sanity floor", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: fixture.data }));
    const err = await runCatalog([], { env: env(), fetchImpl, minPoCourses: 100_000 }).catch((e: unknown) => e);
    expect((err as PipelineError).code).toBe("CATALOG_TOO_SMALL");
    expect(existsSync(catalogPath())).toBe(false);
  });

  test("preserves an existing non-PO course across a PO refresh", async () => {
    seedCatalogWith([fakeHm]);
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: fixture.data }));
    await runCatalog([], { env: env(), fetchImpl, minPoCourses: 1 });
    const artefact = JSON.parse(readFileSync(catalogPath(), "utf8")) as { courses: Course[] };
    const kept = artefact.courses.find((c) => courseKey(c.id) === "CSCI 005 HM");
    expect(kept).toBeDefined();
    expect(kept!.title).toBe(fakeHm.title);
  });

  test("replaces the PO set rather than appending to it", async () => {
    const stalePo: Course = { ...fakeHm, id: { department: "ZZZZ", courseNumber: 999, suffix: "", affiliation: "PO" }, title: "Removed last year" };
    seedCatalogWith([fakeHm, stalePo]);
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: fixture.data }));
    await runCatalog([], { env: env(), fetchImpl, minPoCourses: 1 });
    const artefact = JSON.parse(readFileSync(catalogPath(), "utf8")) as { courses: Course[] };
    expect(artefact.courses.find((c) => courseKey(c.id) === "ZZZZ 999 PO")).toBeUndefined();
    expect(artefact.courses.find((c) => courseKey(c.id) === "CSCI 005 HM")).toBeDefined();
  });

  test("fails on an unmapped GE-looking attribute rather than dropping a requirement tag", async () => {
    const poisoned = structuredClone(fixture.data) as Record<string, unknown>[];
    (poisoned[0] as Record<string, unknown>).attributes = ["PO Area 9 Requirement"];
    (poisoned[0] as Record<string, unknown>).status = "Active";
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: poisoned }));
    const err = await runCatalog([], { env: env(), fetchImpl, minPoCourses: 1 }).catch((e: unknown) => e);
    expect((err as PipelineError).code).toBe("UNMAPPED_ATTRIBUTES");
    expect(existsSync(catalogPath())).toBe(false);
  });

  test("leaves no temp file behind after a failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    await runCatalog([], { env: env(), fetchImpl, minPoCourses: 1 }).catch(() => {});
    expect(readdirSync(join(dir, "data"))).toEqual([]);
  });

  test("--from-csv reads the export instead of calling the API", async () => {
    const csv = new URL("../fixtures/coursedog-sample.csv", import.meta.url).pathname;
    const fetchImpl = vi.fn();
    await runCatalog(["--from-csv", csv], { env: env(), fetchImpl, minPoCourses: 1 });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(CatalogArtefactSchema.safeParse(JSON.parse(readFileSync(catalogPath(), "utf8"))).success).toBe(true);
  });

  test("every courseKey in the written catalog is unique", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: fixture.data }));
    await runCatalog([], { env: env(), fetchImpl, minPoCourses: 1 });
    const artefact = JSON.parse(readFileSync(catalogPath(), "utf8")) as { courses: Course[] };
    const keys = artefact.courses.map((c) => courseKey(c.id));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("AC-B01 / AC-B01b guards (ADR-017)", () => {
  // AC-B01 pins the predicate: the count of id.affiliation === "PO" in the
  // FINISHED catalog, after every exclusion. Counting the Coursedog set instead
  // gave two readings 82 apart, and a floor of 2,000 made that decide pass/fail.
  test("the floor counts PO courses in the finished catalog, not the fetched set", async () => {
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ data: fixture.data })));
    const err = await runCatalog([], { env: env(), fetchImpl, minPoCourses: 100_000 }).catch((e: unknown) => e);
    expect((err as PipelineError).code).toBe("CATALOG_TOO_SMALL");
    expect((err as PipelineError).message).toMatch(/PO/);
    expect(existsSync(catalogPath())).toBe(false);
  });

  test("passes when the PO count clears the floor", async () => {
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ data: fixture.data })));
    await runCatalog([], { env: env(), fetchImpl, minPoCourses: 1 });
    const artefact = JSON.parse(readFileSync(catalogPath(), "utf8")) as { courses: Course[] };
    expect(artefact.courses.filter((c) => c.id.affiliation === "PO").length).toBeGreaterThan(0);
  });

  // AC-B01b: the guard that actually catches a filter eating real courses. The
  // floor never will — deleting six courses out of 2,005 still clears 1,900.
  test("fails when the placeholder rules drop more records than the ceiling allows", async () => {
    const poisoned = structuredClone(fixture.data) as Record<string, unknown>[];
    poisoned.forEach((r, i) => { r.subjectCode = "TEST"; r.code = `TEST${String(i + 1).padStart(3, "0")} PO`; r.status = "Active"; });
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ data: poisoned })));
    const err = await runCatalog([], { env: env(), fetchImpl, minPoCourses: 1, maxExcluded: 2 }).catch((e: unknown) => e);
    expect((err as PipelineError).code).toBe("EXCLUSION_CEILING_EXCEEDED");
    expect(existsSync(catalogPath())).toBe(false);
  });

  test("allows exclusions up to the ceiling", async () => {
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ data: fixture.data })));
    await runCatalog([], { env: env(), fetchImpl, minPoCourses: 1, maxExcluded: 25 });
    expect(existsSync(catalogPath())).toBe(true);
  });
});

describe("AC-B00 — the six real courses a substring filter would delete", () => {
  // Measured by the manager against the shipped catalog: `title contains "test"`
  // removes all six. The rule must stay exact.
  const REAL: [string, string][] = [
    ["ENGL", "Testamentary Fictions"],
    ["HIST", "Pol Protest & Soc Mov Latin Amer"],
    ["RLST", "Leadership, Authority, Protest"],
    ["RLST", "New Testament Christian Origins"],
    ["ENGL", "American Protest Literatures"],
    ["CHST", "Digitizing our Testimonios"],
  ];

  test.each(REAL)("keeps %s — %s", async (dept, title) => {
    const poisoned = structuredClone(fixture.data) as Record<string, unknown>[];
    const first = poisoned.find((r) => r.status === "Active")!;
    first.subjectCode = dept;
    first.code = `${dept}170R PO`;
    first.name = title;
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ data: poisoned })));
    await runCatalog([], { env: env(), fetchImpl, minPoCourses: 1 });
    const artefact = JSON.parse(readFileSync(catalogPath(), "utf8")) as { courses: Course[] };
    expect(artefact.courses.some((c) => c.title === title)).toBe(true);
  });
});
