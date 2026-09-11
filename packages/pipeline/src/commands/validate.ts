import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CatalogArtefactSchema, type Course, type ValidationCheck } from "@gradguide/shared";
import { readEnv, type PipelineEnv } from "../env.ts";
import { PipelineError } from "../errors.ts";
import { log, writeReport } from "../reports.ts";
import { writeArtefact } from "../write.ts";
import { parseRegistrarCsv } from "../registrar/parseCsv.ts";
import { pivotRegistrar } from "../registrar/pivot.ts";
import { checkGeAgreement } from "../validators/geAgreement.ts";
import { checkExclusionAnomalies } from "../validators/exclusionAnomalies.ts";
import { checkHyperscheduleAttributes } from "../validators/hyperscheduleAttributes.ts";
import { checkArtefactSchemas } from "../validators/schema.ts";
import { checkProvenance } from "../validators/provenance.ts";
import { checkSourceQuotes } from "../validators/sourceQuotes.ts";
import { checkManifest } from "../validators/manifest.ts";
import { checkNonEmpty } from "../validators/nonEmpty.ts";
import { doubleCreditPeReport } from "../validators/peDoubleCredit.ts";
import { readSections } from "../readSections.ts";
import type { FetchImpl } from "../http.ts";
import { ValidationReportSchema } from "@gradguide/shared";
import { PIPELINE_VERSION } from "../meta.ts";

export interface ValidateOptions {
  env?: PipelineEnv;
  fetchImpl?: FetchImpl;
  skipNetwork?: boolean;
  /**
   * True inside `pipeline:all`, where validate runs BEFORE the manifest is
   * written (the manifest must describe validated data). Validator 8 then
   * reports "pending" instead of failing, and `all` re-runs it as its final
   * gate once the manifest exists.
   */
  manifestPending?: boolean;
}

export function readCatalog(dataDir: string): Course[] {
  const path = join(dataDir, "catalog.json");
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new PipelineError(`cannot read ${path}; run 'npm run pipeline:catalog' first`, "CATALOG_MISSING");
  }
  const parsed = CatalogArtefactSchema.safeParse(raw);
  if (!parsed.success) {
    throw new PipelineError(`${path} does not match CatalogArtefact`, "CATALOG_INVALID", undefined, parsed.error.issues.slice(0, 20));
  }
  return parsed.data.courses;
}

export async function runValidate(_argv: readonly string[] = [], opts: ValidateOptions = {}): Promise<ValidationCheck[]> {
  const env = opts.env ?? readEnv();
  const catalog = readCatalog(env.dataDir);
  const checks: ValidationCheck[] = [];

  const registrarRows = parseRegistrarCsv(readFileSync(env.registrarCsvPath));
  const registrar = pivotRegistrar(registrarRows);

  // D-12: record the double-weighted PE courses so the open question can be put
  // to the Registrar with its data attached. Not a check — nothing to fail yet.
  const pe = doubleCreditPeReport(registrarRows);
  writeReport("pe-double-credit", pe.report, env.dataDir);
  log("validate.pe-double-credit", { courses: pe.count, status: "open question D-12" });
  log("validate.registrar", { courses: registrar.byCourse.size, unparseable: registrar.unparseable.length });

  if (registrar.unparseable.length > 0) {
    log("validate.registrar.warn", { unparseable: registrar.unparseable.slice(0, 5).join(",") });
  }
  const ge = checkGeAgreement(catalog, registrar.byCourse, env.maxDivergences, registrar.unparseable);
  writeReport("ge-divergences", ge.report, env.dataDir);
  checks.push(ge.check);
  log("validate.ge-agreement", { status: ge.check.status, divergences: ge.check.count, max: env.maxDivergences });

  const ex = checkExclusionAnomalies(catalog, registrar.byCourse);
  writeReport("exclusion-anomalies", ex.report, env.dataDir);
  checks.push(ex.check);
  log("validate.exclusion-anomalies", { status: ex.check.status, anomalies: ex.check.count });

  // 4 — Hyperschedule geCodes vs catalog attributes
  const { sections, unreadable } = readSections(env.dataDir);
  const hs = checkHyperscheduleAttributes(catalog, sections, unreadable);
  writeReport("hyperschedule-attribute-diff", hs.report, env.dataDir);
  checks.push(hs.check);
  log("validate.hyperschedule-attributes", { status: hs.check.status, divergences: hs.check.count, sections: sections.length, unreadableFiles: unreadable.length });

  // 1 — every emitted artefact re-parses
  const schema = checkArtefactSchemas(env.dataDir);
  checks.push(schema.check);
  log("validate.artefact-schemas", { status: schema.check.status, issues: schema.check.count });

  // 2 — non-empty guard, asserted against what is on disk
  const nonEmpty = checkNonEmpty(env.dataDir, 2000, env.terms);
  checks.push(nonEmpty.check);
  log("validate.non-empty", { status: nonEmpty.check.status, issues: nonEmpty.check.count });

  // 6 — provenance stamping
  const prov = checkProvenance(env.dataDir);
  checks.push(prov.check);
  log("validate.provenance", { status: prov.check.status, issues: prov.check.count });

  // 7 — source quotes (network failure warns, never fails)
  const quotes = await checkSourceQuotes(env.dataDir, { fetchImpl: opts.fetchImpl, skipNetwork: opts.skipNetwork });
  writeReport("source-quotes", quotes.report, env.dataDir);
  checks.push(quotes.check);
  log("validate.source-quotes", { status: quotes.check.status, issues: quotes.check.count });

  // 8 — manifest consistency
  const man = checkManifest(env.dataDir);
  if (opts.manifestPending === true && !existsSync(join(env.dataDir, "manifest.json"))) {
    man.check = {
      id: "manifest", status: "warn", count: 0,
      summary: "manifest not generated yet; re-checked as the final step of pipeline:all",
      details: [],
    };
  }
  checks.push(man.check);
  log("validate.manifest", { status: man.check.status, issues: man.check.count });

  const report = {
    generatedAt: new Date().toISOString(),
    generator: `@gradguide/pipeline@${PIPELINE_VERSION} validate`,
    checks,
    ok: checks.every((c) => c.status !== "fail"),
  };
  writeArtefact(join(env.dataDir, "reports", "validation.json"), report, ValidationReportSchema, true);

  return checks;
}
