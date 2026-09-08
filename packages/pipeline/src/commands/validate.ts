import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CatalogArtefactSchema, type Course, type ValidationCheck } from "@gradguide/shared";
import { readEnv, type PipelineEnv } from "../env.ts";
import { PipelineError } from "../errors.ts";
import { log, writeReport } from "../reports.ts";
import { parseRegistrarCsv } from "../registrar/parseCsv.ts";
import { pivotRegistrar } from "../registrar/pivot.ts";
import { checkGeAgreement } from "../validators/geAgreement.ts";
import { checkExclusionAnomalies } from "../validators/exclusionAnomalies.ts";

export interface ValidateOptions { env?: PipelineEnv }

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

  const registrar = pivotRegistrar(parseRegistrarCsv(readFileSync(env.registrarCsvPath)));
  log("validate.registrar", { courses: registrar.byCourse.size, unparseable: registrar.unparseable.length });

  const ge = checkGeAgreement(catalog, registrar.byCourse, env.maxDivergences);
  writeReport("ge-divergences", ge.report, env.dataDir);
  checks.push(ge.check);
  log("validate.ge-agreement", { status: ge.check.status, divergences: ge.check.count, max: env.maxDivergences });

  const ex = checkExclusionAnomalies(catalog, registrar.byCourse);
  writeReport("exclusion-anomalies", ex.report, env.dataDir);
  checks.push(ex.check);
  log("validate.exclusion-anomalies", { status: ex.check.status, anomalies: ex.check.count });

  return checks;
}
