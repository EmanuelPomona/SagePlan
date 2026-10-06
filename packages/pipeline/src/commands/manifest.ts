import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CatalogArtefactSchema, ManifestSchema, OfferingHistoryArtefactSchema, SectionsArtefactSchema,
  ARTEFACT_SCHEMA_VERSION, compareTerms, parseTermCode, termCode, type Manifest,
} from "@sageplan/shared";
import { readEnv, type PipelineEnv } from "../env.ts";
import { PipelineError } from "../errors.ts";
import { log } from "../reports.ts";
import { writeArtefact } from "../write.ts";

export interface ManifestOptions { env?: PipelineEnv }

const readJson = (p: string): unknown => JSON.parse(readFileSync(p, "utf8"));

/**
 * The manifest describes what is ACTUALLY on disk — never what we hoped to
 * build. The app loads it first and trusts it, so a term listed here without a
 * sections file would be a broken "What satisfies this?" filter.
 */
export async function runManifest(_argv: readonly string[] = [], opts: ManifestOptions = {}): Promise<Manifest> {
  const env = opts.env ?? readEnv();
  const dataDir = env.dataDir;

  const catalogPath = join(dataDir, "catalog.json");
  if (!existsSync(catalogPath)) throw new PipelineError(`${catalogPath} is missing; run 'npm run pipeline:catalog'`, "CATALOG_MISSING");
  const catalog = CatalogArtefactSchema.parse(readJson(catalogPath));

  const sections: Manifest["sections"] = [];
  for (const f of existsSync(dataDir) ? readdirSync(dataDir) : []) {
    const m = /^sections-(.+)\.json$/.exec(f);
    if (!m) continue;
    const artefact = SectionsArtefactSchema.parse(readJson(join(dataDir, f)));
    sections.push({ term: termCode(artefact.term), path: `/data/${f}`, fetchedAt: artefact.meta.fetchedAt, sectionCount: artefact.sections.length });
  }
  sections.sort((a, b) => compareTerms(parseTermCode(a.term)!, parseTermCode(b.term)!));

  const historyPath = join(dataDir, "offering-history.json");
  let offeringHistory: Manifest["offeringHistory"] = null;
  if (existsSync(historyPath)) {
    const h = OfferingHistoryArtefactSchema.parse(readJson(historyPath));
    offeringHistory = { path: "/data/offering-history.json", fetchedAt: h.meta.fetchedAt, courseCount: h.history.length };
  }

  const programs: Manifest["programs"] = [];
  const programsDir = join(dataDir, "programs");
  for (const f of existsSync(programsDir) ? readdirSync(programsDir).filter((x) => x.endsWith(".json")) : []) {
    const p = readJson(join(programsDir, f)) as { id?: string; kind?: string; name?: string; confidence?: string };
    programs.push({
      id: p.id ?? f.replace(/\.json$/, ""),
      path: `/data/programs/${f}`,
      kind: (p.kind ?? "general-education") as "general-education" | "major" | "minor",
      name: p.name ?? f,
      confidence: (p.confidence ?? "verified") as Manifest["programs"][number]["confidence"],
    });
  }
  programs.sort((a, b) => a.id.localeCompare(b.id));

  // Only terms that actually have a sections file. A configured term without one
  // is omitted and warned about, never listed as available.
  const available = new Set(sections.map((s) => s.term));
  const upcomingTerms = env.terms.filter((t) => available.has(t))
    .sort((a, b) => compareTerms(parseTermCode(a)!, parseTermCode(b)!));
  const omitted = env.terms.filter((t) => !available.has(t));

  const manifest: Manifest = {
    schemaVersion: ARTEFACT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    catalogYear: catalog.meta.catalogYear,
    catalog: { path: "/data/catalog.json", fetchedAt: catalog.meta.fetchedAt, courseCount: catalog.courses.length },
    sections,
    offeringHistory,
    programs,
    externalCreditRules: { path: "/data/external-credit-rules.json" },
    upcomingTerms,
  };

  writeArtefact(join(dataDir, "manifest.json"), manifest, ManifestSchema, true);
  log("manifest", { courses: catalog.courses.length, sections: sections.length, programs: programs.length, upcomingTerms: upcomingTerms.join("|") || "none", history: offeringHistory ? offeringHistory.courseCount : 0 });
  if (omitted.length > 0) log("manifest.warn", { omittedTerms: omitted.join(","), reason: "no sections file on disk" });
  return manifest;
}
