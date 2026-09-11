import { describe, expect, test } from "vitest";
import { ArtefactMetaSchema } from "@gradguide/shared";
import { readEnv } from "../src/env.ts";
import { makeMeta } from "../src/meta.ts";

describe("readEnv", () => {
  test("falls back to the documented defaults when nothing is set", () => {
    const env = readEnv({});
    expect(env.coursedogCatalogId).toBe("eziiW38FfLsoDlBqEZgV");
    expect(env.coursedogOrigin).toBe("https://catalog.pomona.edu");
    expect(env.hyperscheduleBaseUrl).toBe("https://banana.hyperschedule.io");
    expect(env.terms).toEqual(["FA2026", "SP2027"]);
    expect(env.maxDivergences).toBe(300);
  });

  test("takes overrides from the environment", () => {
    const env = readEnv({ COURSEDOG_ORIGIN: "https://wrong.example", PIPELINE_TERMS: "FA2027", PIPELINE_MAX_DIVERGENCES: "3" });
    expect(env.coursedogOrigin).toBe("https://wrong.example");
    expect(env.terms).toEqual(["FA2027"]);
    expect(env.maxDivergences).toBe(3);
  });

  test("trims and drops blanks in PIPELINE_TERMS", () => {
    expect(readEnv({ PIPELINE_TERMS: " FA2026 , ,SP2027 " }).terms).toEqual(["FA2026", "SP2027"]);
  });

  test("ignores a non-numeric PIPELINE_MAX_DIVERGENCES rather than producing NaN", () => {
    expect(readEnv({ PIPELINE_MAX_DIVERGENCES: "many" }).maxDivergences).toBe(300);
  });
});

describe("makeMeta", () => {
  test("produces a valid ArtefactMeta", () => {
    const meta = makeMeta({ generator: "catalog", sourceUrl: "https://x.test/a", fetchedAt: "2026-09-08T12:00:00Z", catalogYear: "2026-2027" });
    expect(ArtefactMetaSchema.safeParse(meta).success).toBe(true);
  });

  test("names the pipeline and the command in the generator string", () => {
    const meta = makeMeta({ generator: "catalog", sourceUrl: "https://x.test/a", fetchedAt: "2026-09-08T12:00:00Z", catalogYear: "2026-2027" });
    expect(meta.generator).toContain("@gradguide/pipeline");
    expect(meta.generator).toContain("catalog");
  });

  test("stamps generatedAt as a valid ISO instant", () => {
    const meta = makeMeta({ generator: "c", sourceUrl: "https://x.test/a", fetchedAt: "2026-09-08T12:00:00Z", catalogYear: "2026-2027" });
    expect(Number.isNaN(Date.parse(meta.generatedAt))).toBe(false);
  });
});
