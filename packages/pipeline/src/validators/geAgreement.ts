import { courseKey, type Course, type GeAttribute, type ValidationCheck } from "@gradguide/shared";
import type { RegistrarCourse } from "../registrar/pivot.ts";
import { categoriseDivergence, DIVERGENCE_CATEGORIES } from "./divergenceCategory.ts";

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
  type Row = { key: string; title: string; coursedog: GeAttribute[]; registrar: GeAttribute[]; note: string; category: string };
  const rows: Row[] = [];

  for (const course of catalog) {
    if (course.id.affiliation !== "PO") continue; // the export is the Pomona record
    const key = courseKey(course.id);
    const entry = registrar.get(key);

    if (entry === undefined) {
      if (course.attributes.length === 0) continue;
      rows.push({
        key, title: course.title, coursedog: course.attributes, registrar: [],
        note: "missing from Registrar export",
        category: categoriseDivergence(course.attributes, [], false).id,
      });
      continue;
    }
    const reg = [...entry.attributes].sort();
    const cat = [...course.attributes].sort();
    if (JSON.stringify(reg) !== JSON.stringify(cat)) {
      rows.push({
        key, title: course.title, coursedog: course.attributes, registrar: [...entry.attributes],
        note: "attribute sets differ",
        category: categoriseDivergence(course.attributes, [...entry.attributes], true).id,
      });
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
    rows.push({
      key, title: entry.title, coursedog: [], registrar: [...entry.attributes],
      note: "missing from catalog",
      category: categoriseDivergence([], [...entry.attributes], true, true).id,
    });
  }

  rows.sort((a, b) => a.key.localeCompare(b.key));

  // AC-P09: a category is a SHAPE, not a restatement of the divergence. Every
  // row carries one, each shape reports its count, a sample showing both sides,
  // and one sentence on which source is likelier right AND why that follows from
  // the shape. `unclassified` is the number the criterion requires to be zero —
  // not the ~260 total, which is the steady state.
  const byCategory = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byCategory.get(r.category) ?? [];
    list.push(r);
    byCategory.set(r.category, list);
  }
  const unclassified = byCategory.get("unclassified") ?? [];

  const shapeSections: string[] = [];
  for (const id of Object.keys(DIVERGENCE_CATEGORIES)) {
    if (id === "none") continue;
    const group = byCategory.get(id);
    if (group === undefined || group.length === 0) continue;
    const meta = DIVERGENCE_CATEGORIES[id]!;
    const sample = group[0]!;
    shapeSections.push(
      `### ${meta.label}`,
      "",
      `\`${id}\` — **${group.length}** course(s).`,
      "",
      `**Sample:** \`${sample.key}\` — catalog ${fmt(sample.coursedog)} · Registrar ${fmt(sample.registrar)}`,
      "",
      `**More likely right: ${meta.likelierCorrect}.** ${meta.why}`,
      "",
    );
  }

  const status: ValidationCheck["status"] =
    rows.length === 0 ? "pass"
      : unclassified.length > 0 || rows.length > maxDivergences ? "fail"
        : "warn";

  const report = [
    "# Coursedog vs Registrar — GE attribute divergences",
    "",
    `**${rows.length}** Pomona course(s) disagree between the two sources, across `
      + `**${[...byCategory.keys()].filter((k) => k !== "unclassified").length}** shape(s).`,
    `**Unclassified: ${unclassified.length}** — AC-P09 requires this to be zero.`,
    `Build threshold: fail above ${maxDivergences} total (\`PIPELINE_MAX_DIVERGENCES\`), or on any unclassified row.`,
    "",
    "The raw total is not itself a defect. The two sources have always disagreed:",
    `~${rows.length} of ~${catalog.filter((c) => c.id.affiliation === "PO").length} Pomona courses is the steady state, and a guard that`,
    "fires on the steady state is not a guard (ADR-016). What matters is that every",
    "divergence has a shape somebody has reasoned about.",
    "",
    "## Summary by shape",
    "",
    "| Shape | Count | More likely right |",
    "|---|---|---|",
    ...[...byCategory.entries()]
      .filter(([id]) => id !== "none")
      .sort((a, b) => b[1].length - a[1].length)
      .map(([id, g]) => `| \`${id}\` | ${g.length} | ${DIVERGENCE_CATEGORIES[id]?.likelierCorrect ?? "unknown"} |`),
    "",
    "## Shapes",
    "",
    ...shapeSections,
    "## How to resolve",
    "",
    "Neither source is authoritative and the pipeline never picks one. Coursedog is",
    "the live catalog; the Registrar export is a dated snapshot (2026-09-08) used only",
    "to validate. The per-shape verdicts above are hypotheses to take to the Registrar,",
    "not actions the pipeline has taken. Work shape by shape rather than row by row:",
    "one decision about a shape usually settles every row in it.",
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
      summary: `${rows.length} Coursedog/Registrar GE divergence(s) across Pomona courses in `
        + `${[...byCategory.keys()].filter((k) => k !== "unclassified").length} shape(s); `
        + `${unclassified.length} unclassified`
        + (unparseable.length > 0 ? `; ${unparseable.length} Registrar row(s) undecodable` : ""),
      count: rows.length,
      details: [
        ...(unclassified.length > 0 ? [`${unclassified.length} divergence(s) fit no named shape — AC-P09 requires zero`] : []),
        ...[...byCategory.entries()].filter(([id]) => id !== "none").map(([id, g]) => `${id}: ${g.length}`),
        ...unparseable.map((u) => `Registrar row could not be decomposed: ${u}`),
        ...rows.map((r) => `${r.key}: coursedog=${fmt(r.coursedog)} registrar=${fmt(r.registrar)} (${r.note})`),
      ].slice(0, 20),
    },
    report,
  };
}
