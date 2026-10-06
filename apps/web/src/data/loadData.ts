import {
  CatalogArtefactSchema,
  ExternalCreditRulesSchema,
  ManifestSchema,
  OfferingHistoryArtefactSchema,
  ProgramSchema,
  SectionsArtefactSchema,
  type CatalogArtefact,
  type ExternalCreditRules,
  type Manifest,
  type OfferingHistoryArtefact,
  type Program,
  type SectionsArtefact,
  type TermCode,
} from "@gradguide/shared";
import type { ZodType } from "zod";

export type DataError = {
  path: string;
  kind: "notFound" | "badJson" | "schema" | "network";
  detail: string;
};

export type Loaded<T> = { ok: true; value: T } | { ok: false; error: DataError };

/**
 * Every artefact fetch, with its failure states.
 *
 * The app never renders a blank page or an endless spinner: each failure names
 * the file that failed and what was wrong with it, because the person reading it
 * is a student deciding whether to trust an unofficial tool.
 *
 * All paths are same-origin. The CSP in index.html enforces that.
 */
async function loadJson<T>(path: string, schema: ZodType<T>): Promise<Loaded<T>> {
  let response: Response;
  try {
    response = await fetch(path, { credentials: "omit" });
  } catch (cause) {
    return { ok: false, error: { path, kind: "network", detail: describe(cause) } };
  }

  if (response.status === 404) {
    return { ok: false, error: { path, kind: "notFound", detail: `${path} was not found.` } };
  }
  if (!response.ok) {
    return { ok: false, error: { path, kind: "network", detail: `${path} returned ${response.status}.` } };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (cause) {
    return { ok: false, error: { path, kind: "badJson", detail: describe(cause) } };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.join(".") ?? "";
    return {
      ok: false,
      error: {
        path,
        kind: "schema",
        detail: where ? `${where}: ${first?.message ?? "did not match the expected shape"}` : (first?.message ?? "did not match the expected shape"),
      },
    };
  }

  return { ok: true, value: parsed.data };
}

function describe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export const loadManifest = (): Promise<Loaded<Manifest>> => loadJson("/data/manifest.json", ManifestSchema);

export const loadCatalog = (path = "/data/catalog.json"): Promise<Loaded<CatalogArtefact>> =>
  loadJson(path, CatalogArtefactSchema);

export const loadRules = (path = "/data/external-credit-rules.json"): Promise<Loaded<ExternalCreditRules>> =>
  loadJson(path, ExternalCreditRulesSchema);

export const loadProgram = (path: string): Promise<Loaded<Program>> => loadJson(path, ProgramSchema);

/** Every program the manifest lists, in manifest order. */
export async function loadPrograms(manifest: Manifest): Promise<Loaded<Program[]>> {
  const results = await Promise.all(manifest.programs.map((p) => loadProgram(p.path)));
  const failed = results.find((r) => !r.ok);
  if (failed && !failed.ok) return { ok: false, error: failed.error };
  return { ok: true, value: results.map((r) => (r.ok ? r.value : null)).filter((p): p is Program => p !== null) };
}

/** Loaded lazily, the first time "What satisfies this?" is opened. */
export const loadSections = (term: TermCode): Promise<Loaded<SectionsArtefact>> =>
  loadJson(`/data/sections-${term}.json`, SectionsArtefactSchema);

export const loadHistory = (): Promise<Loaded<OfferingHistoryArtefact>> =>
  loadJson("/data/offering-history.json", OfferingHistoryArtefactSchema);
