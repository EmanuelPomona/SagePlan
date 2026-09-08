import { readFileSync } from "node:fs";
import { ArtefactMetaSchema, type ValidationCheck } from "@gradguide/shared";
import { generatedArtefacts } from "./artefactFiles.ts";

/**
 * Validator 6 — provenance stamping. The UI renders "catalog data as of
 * {fetchedAt}" and the staleness banner keys off catalogYear, so an artefact
 * without a full meta block silently makes the app lie about its freshness.
 */
export function checkProvenance(dataDir: string): { check: ValidationCheck; report: string } {
  const issues: string[] = [];
  let checked = 0;

  for (const file of generatedArtefacts(dataDir)) {
    if (!file.hasMeta) continue;
    checked++;
    let meta: unknown;
    try {
      meta = (JSON.parse(readFileSync(file.path, "utf8")) as { meta?: unknown }).meta;
    } catch {
      issues.push(`${file.rel}: unreadable`);
      continue;
    }
    if (meta === undefined || meta === null) { issues.push(`${file.rel}: no meta block`); continue; }
    const m = meta as Record<string, unknown>;
    for (const field of ["fetchedAt", "sourceUrl", "catalogYear"] as const) {
      if (m[field] === undefined || m[field] === null || m[field] === "") issues.push(`${file.rel}: meta.${field} is missing`);
    }
    const parsed = ArtefactMetaSchema.safeParse(meta);
    if (!parsed.success) {
      for (const i of parsed.error.issues.slice(0, 3)) issues.push(`${file.rel}: meta.${i.path.join(".")} — ${i.message}`);
    }
  }

  return {
    check: {
      id: "provenance",
      status: issues.length > 0 ? "fail" : "pass",
      summary: `${checked} artefact(s) checked for provenance, ${issues.length} issue(s)`,
      count: issues.length,
      details: issues.slice(0, 20),
    },
    report: ["# Provenance", "", `${checked} artefact(s) checked, ${issues.length} issue(s).`, "", ...issues.map((i) => `- ${i}`), ""].join("\n"),
  };
}
