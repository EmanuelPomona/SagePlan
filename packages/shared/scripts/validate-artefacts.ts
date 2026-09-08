/**
 * Validates every file under /data against the contract. Used by
 * scripts/contract-test.sh and `npm run seed`.
 *
 * Exit codes: 0 all present artefacts valid; 1 a validation failed;
 * 2 could not verify (pipeline artefacts not generated yet). "Could not verify"
 * is never reported as a pass.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";
import { ExternalCreditRulesSchema, ManifestSchema, ProgramSchema, SCHEMAS } from "../src/index.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(here, "../../..");
const DATA = resolve(ROOT, "data");
const PAGES = resolve(DATA, "sources/catalog-pages");

type Outcome = { file: string; ok: boolean; message: string };
const outcomes: Outcome[] = [];
let unverifiable = false;

function normalise(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function validateFile(path: string, schema: z.ZodType, label: string): unknown | undefined {
  const rel = path.replace(ROOT + "/", "");
  if (!existsSync(path)) { outcomes.push({ file: rel, ok: false, message: `${label}: MISSING` }); return undefined; }
  let json: unknown;
  try { json = JSON.parse(readFileSync(path, "utf8")); } catch (e) { outcomes.push({ file: rel, ok: false, message: `${label}: not JSON (${(e as Error).message})` }); return undefined; }
  const r = schema.safeParse(json);
  if (!r.success) {
    const issues = r.error.issues.slice(0, 8).map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
    outcomes.push({ file: rel, ok: false, message: `${label}: ${r.error.issues.length} schema issue(s)\n${issues}` });
    return undefined;
  }
  outcomes.push({ file: rel, ok: true, message: `${label}: valid` });
  return r.data;
}

const snapshots = new Map<string, string>();
if (existsSync(PAGES)) {
  for (const f of readdirSync(PAGES)) if (f.endsWith(".txt")) snapshots.set(f.replace(/\.txt$/, ""), normalise(readFileSync(resolve(PAGES, f), "utf8")));
}

function checkQuote(owner: string, quote: string, slug: string): void {
  const snap = snapshots.get(slug);
  if (!snap) { outcomes.push({ file: owner, ok: false, message: `sourceRef.slug "${slug}" has no snapshot in data/sources/catalog-pages/` }); return; }
  if (!snap.includes(normalise(quote))) outcomes.push({ file: owner, ok: false, message: `sourceQuote is NOT a verbatim substring of ${slug}.txt: "${quote.slice(0, 80)}…"` });
}

// 1. Hand-written programs: always validated, and every quote must be verbatim.
const programsDir = resolve(DATA, "programs");
const programFiles = existsSync(programsDir) ? readdirSync(programsDir).filter((f) => f.endsWith(".json")) : [];
if (programFiles.length === 0) outcomes.push({ file: "data/programs/", ok: false, message: "no program JSON files" });
for (const f of programFiles) {
  const p = validateFile(resolve(programsDir, f), ProgramSchema, "Program") as z.infer<typeof ProgramSchema> | undefined;
  if (!p) continue;
  const owner = `data/programs/${f}`;
  const ids = new Set<string>();
  for (const req of p.requirements) {
    if (ids.has(req.id)) outcomes.push({ file: owner, ok: false, message: `duplicate requirement id ${req.id}` });
    ids.add(req.id);
    checkQuote(`${owner}#${req.id}`, req.sourceQuote, req.sourceRef.slug);
    if (req.overlapPolicy.kind === "allowOnly" || req.overlapPolicy.kind === "denyOnly")
      for (const rid of req.overlapPolicy.requirementIds) if (!p.requirements.some((r) => r.id === rid)) outcomes.push({ file: owner, ok: false, message: `${req.id}.overlapPolicy references unknown requirement ${rid}` });
  }
  for (const c of p.constraints ?? []) {
    checkQuote(`${owner}#constraint`, c.sourceQuote, c.sourceRef.slug);
    for (const rid of c.requirementIds) if (!ids.has(rid)) outcomes.push({ file: owner, ok: false, message: `constraint references unknown requirement ${rid}` });
  }
  for (const a of p.advisories ?? []) checkQuote(`${owner}#${a.id}`, a.sourceQuote, a.sourceRef.slug);
}

// 2. External credit rules: always validated.
const rules = validateFile(resolve(DATA, "external-credit-rules.json"), ExternalCreditRulesSchema, "ExternalCreditRules") as z.infer<typeof ExternalCreditRulesSchema> | undefined;
if (rules) {
  const keys = new Set(rules.subjects.map((s) => s.key));
  for (const r of rules.rules) {
    checkQuote(`data/external-credit-rules.json#${r.id}`, r.sourceQuote, r.sourceRef.slug);
    for (const k of [...(r.match.subjectKeys ?? []), ...(r.match.excludeSubjectKeys ?? [])]) if (!keys.has(k)) outcomes.push({ file: "data/external-credit-rules.json", ok: false, message: `rule ${r.id} references unknown subject ${k}` });
  }
}

// 3. Generated artefacts: validated when the manifest exists; otherwise NOT VERIFIED.
const manifestPath = resolve(DATA, "manifest.json");
if (!existsSync(manifestPath)) {
  unverifiable = true;
  outcomes.push({ file: "data/manifest.json", ok: true, message: "NOT VERIFIED: pipeline has not generated artefacts yet (no manifest)" });
} else {
  const m = validateFile(manifestPath, ManifestSchema, "Manifest") as z.infer<typeof ManifestSchema> | undefined;
  if (m) {
    validateFile(resolve(DATA, m.catalog.path.replace(/^\/?data\//, "")), SCHEMAS["CatalogArtefact"]!, "CatalogArtefact");
    for (const s of m.sections) validateFile(resolve(DATA, s.path.replace(/^\/?data\//, "")), SCHEMAS["SectionsArtefact"]!, `SectionsArtefact ${s.term}`);
    if (m.offeringHistory) validateFile(resolve(DATA, m.offeringHistory.path.replace(/^\/?data\//, "")), SCHEMAS["OfferingHistoryArtefact"]!, "OfferingHistoryArtefact");
    for (const p of m.programs) if (!existsSync(resolve(DATA, p.path.replace(/^\/?data\//, "")))) outcomes.push({ file: "data/manifest.json", ok: false, message: `manifest lists missing program ${p.path}` });
    for (const t of m.upcomingTerms) if (!m.sections.some((s) => s.term === t)) outcomes.push({ file: "data/manifest.json", ok: false, message: `upcomingTerms includes ${t} with no sections file` });
  }
}

for (const o of outcomes) console.log(`${o.ok ? "OK  " : "FAIL"}  ${o.file}\n      ${o.message.replace(/\n/g, "\n      ")}`);
const failed = outcomes.filter((o) => !o.ok).length;
console.log(`\n${outcomes.length} check(s), ${failed} failed${unverifiable ? ", generated artefacts NOT VERIFIED" : ""}`);
process.exit(failed ? 1 : unverifiable ? 2 : 0);
