import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The repository root, derived from this file's own location
 * (packages/pipeline/src/env.ts -> ../../..). npm runs a workspace script with
 * the PACKAGE as cwd, so a bare "data" would resolve to packages/pipeline/data.
 * Every path below is anchored here instead.
 */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Resolve a configured path against the repo root unless it is already absolute. */
export function fromRepoRoot(p: string): string {
  return isAbsolute(p) ? p : join(REPO_ROOT, p);
}

/**
 * Build-time configuration. There are no secrets on this project; every default
 * below is the value committed in .env.example, so the pipeline runs from a
 * clean clone with no setup.
 */
export interface PipelineEnv {
  coursedogCatalogId: string;
  coursedogOrigin: string;
  coursedogBaseUrl: string;
  hyperscheduleBaseUrl: string;
  terms: string[];
  registrarCsvPath: string;
  maxDivergences: number;
  dataDir: string;
  catalogYear: string;
}

const DEFAULTS = {
  COURSEDOG_CATALOG_ID: "eziiW38FfLsoDlBqEZgV",
  COURSEDOG_ORIGIN: "https://catalog.pomona.edu",
  COURSEDOG_BASE_URL: "https://app.coursedog.com",
  HYPERSCHEDULE_BASE_URL: "https://banana.hyperschedule.io",
  PIPELINE_TERMS: "FA2026,SP2027",
  REGISTRAR_GE_CSV: "data/sources/registrar-ge-export-2026-09-08.csv",
  // 300, ratified in ADR-016 and mirrored in .env.example and docs/API.md section 4.
  // The measured steady state is ~260 divergences across ~2,000 PO courses; a guard
  // that fires on the steady state is not a guard. Under the old default of 25,
  // validator 3 failed every run and pipeline:all could never write a manifest.
  PIPELINE_MAX_DIVERGENCES: "300",
  PIPELINE_DATA_DIR: "data",
  PIPELINE_CATALOG_YEAR: "2026-2027",
} as const;

function pick(env: Record<string, string | undefined>, key: keyof typeof DEFAULTS): string {
  const v = env[key];
  return v !== undefined && v.trim() !== "" ? v.trim() : DEFAULTS[key];
}

export function readEnv(env: Record<string, string | undefined> = process.env): PipelineEnv {
  const rawMax = Number(pick(env, "PIPELINE_MAX_DIVERGENCES"));
  return {
    coursedogCatalogId: pick(env, "COURSEDOG_CATALOG_ID"),
    coursedogOrigin: pick(env, "COURSEDOG_ORIGIN"),
    coursedogBaseUrl: pick(env, "COURSEDOG_BASE_URL"),
    hyperscheduleBaseUrl: pick(env, "HYPERSCHEDULE_BASE_URL"),
    terms: pick(env, "PIPELINE_TERMS").split(",").map((t) => t.trim()).filter((t) => t.length > 0),
    registrarCsvPath: fromRepoRoot(pick(env, "REGISTRAR_GE_CSV")),
    maxDivergences: Number.isFinite(rawMax) ? rawMax : Number(DEFAULTS.PIPELINE_MAX_DIVERGENCES),
    dataDir: fromRepoRoot(pick(env, "PIPELINE_DATA_DIR")),
    catalogYear: pick(env, "PIPELINE_CATALOG_YEAR"),
  };
}
