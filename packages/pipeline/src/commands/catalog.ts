import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CatalogArtefactSchema } from "@gradguide/shared";
import { readEnv, type PipelineEnv } from "../env.ts";
import { PipelineError } from "../errors.ts";
import type { FetchImpl } from "../http.ts";
import { makeMeta } from "../meta.ts";
import { log, writeReport } from "../reports.ts";
import { writeArtefact } from "../write.ts";
import { applyMembership, loadDenylist, membershipReport } from "../placeholders.ts";
import { mergeCourses, readExistingCourses } from "../catalogMerge.ts";
import { fetchCoursedogCourses, coursedogSearchUrl } from "../coursedog/client.ts";
import { parseCoursedogCsv } from "../coursedog/csvFallback.ts";
import { normaliseAll, type NormaliseIssue } from "../coursedog/normalise.ts";
import { dedupeCourses } from "../coursedog/dedupe.ts";
import type { RawCoursedogCourse } from "../coursedog/raw.ts";

export interface CatalogOptions {
  env?: PipelineEnv;
  fetchImpl?: FetchImpl;
  /**
   * AC-B01 (ADR-017). The predicate is PINNED: the count of courses with
   * `id.affiliation === "PO"` in the FINISHED catalog, after every exclusion.
   * "Active Pomona courses" had two defensible readings 82 apart — 2,087 emitted
   * by this command, 2,005 carrying affiliation PO — and a floor of 2,000 made
   * that ambiguity decide pass/fail. Measured today: 2,005. The floor's only job
   * is catching a truncated fetch, so it has headroom.
   */
  minPoCourses?: number;
  /**
   * AC-B01b. Ceiling on how many records the placeholder rules may drop. This is
   * the guard that catches a filter eating real courses; the floor never will,
   * because deleting six courses out of 2,005 still clears 1,900.
   */
  maxExcluded?: number;
}

function summariseIssues(issues: readonly NormaliseIssue[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const i of issues) counts[i.reason] = (counts[i.reason] ?? 0) + 1;
  return counts;
}

export async function runCatalog(argv: readonly string[], opts: CatalogOptions = {}): Promise<void> {
  const env = opts.env ?? readEnv();
  const minPoCourses = opts.minPoCourses ?? 1900;
  const maxExcluded = opts.maxExcluded ?? 25;
  const fromCsvIndex = argv.indexOf("--from-csv");
  const fetchedAt = new Date().toISOString();

  let records: RawCoursedogCourse[];
  let sourceUrl: string;

  if (fromCsvIndex !== -1) {
    const path = argv[fromCsvIndex + 1];
    if (!path) throw new PipelineError("--from-csv needs a file path", "CLI_BAD_ARGS");
    records = parseCoursedogCsv(readFileSync(path, "utf8"));
    sourceUrl = coursedogSearchUrl(env, 0);
    log("catalog", { source: "csv", file: path, records: records.length });
  } else {
    const fetched = await fetchCoursedogCourses(env, { fetchImpl: opts.fetchImpl });
    records = fetched.records;
    sourceUrl = fetched.sourceUrl;
    log("catalog", { source: "coursedog", records: records.length, origin: env.coursedogOrigin });
  }

  if (records.length === 0) {
    throw new PipelineError("Coursedog returned zero records; keeping yesterday's catalog", "CATALOG_EMPTY");
  }

  const { courses: normalised, issues } = normaliseAll(records, { catalogYear: env.catalogYear, fetchedAt });
  const issueCounts = summariseIssues(issues);
  // AC-B01 asks for the excluded counts BY STATUS, not one "not-active" total:
  // the whole point of ADR-016 item 1 is that Banked and Inactive are different
  // populations and neither belongs in the catalog.
  const byStatus: Record<string, number> = {};
  for (const r of records) {
    const st = String(r.status ?? "<none>");
    if (st !== "Active") byStatus[`excluded_${st}`] = (byStatus[`excluded_${st}`] ?? 0) + 1;
  }
  log("catalog.normalise", { in: records.length, active: normalised.length, ...byStatus, ...issueCounts });

  // A GE-shaped attribute we do not recognise means a requirement tag would be
  // silently dropped. Fail instead — the mapping is a human decision.
  const unmapped = issues.filter((i) => i.reason === "unmapped-attribute");
  if (unmapped.length > 0) {
    throw new PipelineError(
      `${unmapped.length} course(s) carry an unmapped GE-looking attribute: ${unmapped.slice(0, 5).map((i) => `${i.code} (${i.detail})`).join("; ")}`,
      "UNMAPPED_ATTRIBUTES",
    );
  }

  const { courses: deduped, discarded } = dedupeCourses(normalised);
  log("catalog.dedupe", { in: normalised.length, out: deduped.length, discarded: discarded.length });

  if (deduped.length === 0) {
    throw new PipelineError("no courses survived normalisation; keeping yesterday's catalog", "CATALOG_EMPTY");
  }

  const catalogPath = join(env.dataDir, "catalog.json");
  const mergedRaw = mergeCourses(readExistingCourses(catalogPath), deduped, "PO");

  // ADR-016 / AC-B00. Applied to the whole merged list, not just the PO set: the
  // rule must hold for every writer of catalog.json.
  const membership = applyMembership(mergedRaw, loadDenylist(env.dataDir));
  const merged = membership.kept;
  const poCount = merged.filter((c) => c.id.affiliation === "PO").length;
  const preserved = merged.filter((c) => c.id.affiliation !== "PO").length;

  // Both guards run BEFORE anything is written, so a failure leaves yesterday's
  // catalog exactly as it was.
  if (membership.excluded.length > maxExcluded) {
    throw new PipelineError(
      `the placeholder rules dropped ${membership.excluded.length} record(s), above the ceiling of ${maxExcluded}. `
        + `That is the signature of a filter eating real courses, not of placeholders. Excluded: `
        + `${membership.excluded.slice(0, 5).map((e) => e.key).join(", ")}`,
      "EXCLUSION_CEILING_EXCEEDED",
    );
  }
  if (poCount < minPoCourses) {
    throw new PipelineError(
      `only ${poCount} course(s) with affiliation PO after exclusions, below the floor of ${minPoCourses}; keeping yesterday's catalog`,
      "CATALOG_TOO_SMALL",
    );
  }

  writeReport("catalog-excluded", membershipReport(membership, mergedRaw.length), env.dataDir);

  writeArtefact(
    catalogPath,
    { meta: makeMeta({ generator: "catalog", sourceUrl, fetchedAt, catalogYear: env.catalogYear }), courses: merged },
    CatalogArtefactSchema,
  );

  // Records the normaliser refused. Counted in the log before, but never listed
  // anywhere a human would look; "1 unparseable-id" tells nobody which course.
  const dropped = issues.filter((i) => i.reason !== "not-active");
  writeReport(
    "catalog-dropped",
    [
      "# Records dropped during catalog ingestion",
      "",
      `${records.length} upstream record(s) -> ${deduped.length} course(s).`,
      "",
      `- not Active (administrative placeholders and test rows): **${issueCounts["not-active"] ?? 0}**`,
      `- refused by the normaliser: **${dropped.length}**`,
      "",
      "Non-Active records are expected: Coursedog carries Banked and Inactive rows",
      "such as `PE WAIVER` and `TEST001 PO`. The rows below are different — they",
      "look like courses but could not be represented, so each is a real loss.",
      "",
      "| Course | Reason | Detail |",
      "|---|---|---|",
      ...dropped.map((i) => `| ${i.code} | ${i.reason} | ${i.detail.slice(0, 120)} |`),
      "",
    ].join("\n"),
    env.dataDir,
  );

  if (discarded.length > 0) {
    writeReport(
      "catalog-duplicates",
      [
        "# Catalog duplicate editions",
        "",
        `Coursedog returned ${discarded.length} duplicate course record(s). Where two editions`,
        "of one course disagree, the pipeline keeps the **most complete** record (more GE",
        "attributes first, then more catalog detail). Newest does NOT win: the newer edition",
        "is frequently the one with an empty `attributes` array.",
        "",
        "| Course | Title | Attributes kept | Attributes discarded | Reason |",
        "|---|---|---|---|---|",
        ...discarded.map((d) =>
          `| ${d.key} | ${d.title} | ${d.keptAttributes.join(", ") || "—"} | ${d.discardedAttributes.join(", ") || "—"} | ${d.reason} |`,
        ),
        "",
      ].join("\n"),
      env.dataDir,
    );
  }

  log("catalog.write", {
    path: catalogPath, courses: merged.length,
    po: poCount,
    preserved, unmapped: 0, droppedRecords: dropped.length,
    excluded: membership.excluded.length, flagged: membership.suspicious.length,
  });
}
