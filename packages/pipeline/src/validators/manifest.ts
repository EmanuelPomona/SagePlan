import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ManifestSchema, type ValidationCheck } from "@gradguide/shared";

/** Resolve a manifest path ("/data/catalog.json") to a file inside dataDir. */
function resolveArtefactPath(dataDir: string, listed: string): string {
  return join(dataDir, listed.replace(/^\/?data\//, ""));
}

/**
 * Validator 8 — manifest consistency. The manifest is the FIRST file the app
 * loads and the one it trusts, so a manifest naming a file that is not there is
 * a broken app, not a warning.
 */
export function checkManifest(dataDir: string): { check: ValidationCheck; report: string } {
  const issues: string[] = [];
  const path = join(dataDir, "manifest.json");

  if (!existsSync(path)) {
    issues.push("manifest.json is missing; run 'npm run pipeline:manifest'");
  } else {
    let raw: unknown;
    try { raw = JSON.parse(readFileSync(path, "utf8")); } catch (e) { raw = undefined; issues.push(`manifest.json is not valid JSON (${(e as Error).message})`); }
    const parsed = raw === undefined ? undefined : ManifestSchema.safeParse(raw);
    if (parsed && !parsed.success) {
      for (const i of parsed.error.issues.slice(0, 10)) issues.push(`manifest.${i.path.join(".")} — ${i.message}`);
    } else if (parsed && parsed.success) {
      const m = parsed.data;
      const listed: string[] = [m.catalog.path, m.externalCreditRules.path, ...m.sections.map((s) => s.path), ...m.programs.map((p) => p.path)];
      if (m.offeringHistory) listed.push(m.offeringHistory.path);
      for (const p of listed) {
        if (!existsSync(resolveArtefactPath(dataDir, p))) issues.push(`manifest lists ${p}, which does not exist`);
      }
      for (const term of m.upcomingTerms) {
        if (!existsSync(join(dataDir, `sections-${term}.json`))) issues.push(`upcomingTerms contains ${term} but sections-${term}.json does not exist`);
      }
    }
  }

  return {
    check: {
      id: "manifest",
      status: issues.length > 0 ? "fail" : "pass",
      summary: issues.length === 0 ? "manifest is consistent with what is on disk" : `${issues.length} manifest inconsistency/inconsistencies`,
      count: issues.length,
      details: issues.slice(0, 20),
    },
    report: ["# Manifest consistency", "", `${issues.length} issue(s).`, "", ...issues.map((i) => `- ${i}`), ""].join("\n"),
  };
}
