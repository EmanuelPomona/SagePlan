import { courseKey, type Course, type GeAttribute, type ValidationCheck } from "@gradguide/shared";
import type { RegistrarCourse } from "../registrar/pivot.ts";

const fmt = (a: readonly GeAttribute[]) => (a.length > 0 ? [...a].sort().join(", ") : "—");

/**
 * Validator 3 — cross-source GE agreement (docs/API.md section 4).
 *
 * Coursedog and the Registrar export are two independent records of the same
 * fact. Neither is authoritative, so every difference is REPORTED with both
 * sides shown and an empty column for the owner to adjudicate. The pipeline
 * never silently resolves toward one source.
 */
export function checkGeAgreement(
  catalog: readonly Course[],
  registrar: ReadonlyMap<string, RegistrarCourse>,
  maxDivergences: number,
  /** Course Number strings in the export that could not be decomposed. */
  unparseable: readonly string[] = [],
): { check: ValidationCheck; report: string } {
  type Row = { key: string; title: string; coursedog: GeAttribute[]; registrar: GeAttribute[]; note: string };
  const rows: Row[] = [];

  for (const course of catalog) {
    if (course.id.affiliation !== "PO") continue; // the export is the Pomona record
    const key = courseKey(course.id);
    const entry = registrar.get(key);

    if (entry === undefined) {
      if (course.attributes.length === 0) continue;
      rows.push({ key, title: course.title, coursedog: course.attributes, registrar: [], note: "missing from Registrar export" });
      continue;
    }
    const reg = [...entry.attributes].sort();
    const cat = [...course.attributes].sort();
    if (JSON.stringify(reg) !== JSON.stringify(cat)) {
      rows.push({ key, title: course.title, coursedog: course.attributes, registrar: [...entry.attributes], note: "attribute sets differ" });
    }
  }

  // The other direction: a Pomona course the Registrar tags with GE attributes
  // but which never made it into the catalog. These are the divergences most
  // likely to hurt a student — the course simply cannot be found in the app —
  // and iterating only the catalog made them invisible.
  const inCatalog = new Set(catalog.filter((c) => c.id.affiliation === "PO").map((c) => courseKey(c.id)));
  for (const [key, entry] of registrar) {
    if (entry.affiliation !== "PO") continue;
    if (inCatalog.has(key)) continue;
    if (entry.attributes.size === 0) continue;
    rows.push({ key, title: entry.title, coursedog: [], registrar: [...entry.attributes], note: "missing from catalog" });
  }

  rows.sort((a, b) => a.key.localeCompare(b.key));
  const status: ValidationCheck["status"] = rows.length === 0 ? "pass" : rows.length > maxDivergences ? "fail" : "warn";

  const report = [
    "# Coursedog vs Registrar — GE attribute divergences",
    "",
    `**${rows.length}** Pomona course(s) disagree between the two sources.`,
    `Threshold: warn from 1, fail above ${maxDivergences} (\`PIPELINE_MAX_DIVERGENCES\`).`,
    "",
    "## How to resolve",
    "",
    "Neither source is authoritative and the pipeline never picks one. Coursedog is",
    "the live catalog; the Registrar export is a dated snapshot used only to validate.",
    "For each row, decide which record is right, fix it upstream, and write the reason",
    "in the Explanation column so the next run's diff is smaller. A row that is",
    "expected (for example a course retagged after the export was taken) can stay",
    "here with its explanation.",
    "",
    ...(unparseable.length > 0
      ? [`## Registrar rows that could not be decomposed (${unparseable.length})`, "",
         "Not compared against the catalog at all. Each is either a course range or a",
         "malformed Course Number in the export.", "",
         ...unparseable.map((u) => `- \`${u}\``), ""]
      : []),
    "| Course | Title | Coursedog | Registrar | Note | Explanation |",
    "|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.key} | ${r.title} | ${fmt(r.coursedog)} | ${fmt(r.registrar)} | ${r.note} | |`),
    "",
  ].join("\n");

  return {
    check: {
      id: "ge-agreement",
      status,
      summary: `${rows.length} Coursedog/Registrar GE divergence(s) across Pomona courses` +
        (unparseable.length > 0 ? `; ${unparseable.length} Registrar row(s) undecodable` : ""),
      count: rows.length,
      details: [
        ...unparseable.map((u) => `Registrar row could not be decomposed: ${u}`),
        ...rows.map((r) => `${r.key}: coursedog=${fmt(r.coursedog)} registrar=${fmt(r.registrar)} (${r.note})`),
      ].slice(0, 20),
    },
    report,
  };
}
