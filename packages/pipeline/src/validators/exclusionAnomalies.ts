import { courseKey, type Course, type GeAttribute, type ValidationCheck } from "@gradguide/shared";
import type { RegistrarCourse } from "../registrar/pivot.ts";

const isArea = (a: string) => a.startsWith("AREA_");

/**
 * Validator 5 — exclusion anomalies (docs/API.md section 4).
 *
 * The catalog's own eligibility exclusions are already baked into
 * `Course.attributes`, and the engine adds no exclusion logic by design
 * (ARCHITECTURE.md rule 1). So where the data contradicts a documented
 * exclusion, a human decides — the pipeline only surfaces it. Always `warn`.
 */
export function checkExclusionAnomalies(
  catalog: readonly Course[],
  registrar?: ReadonlyMap<string, RegistrarCourse>,
): { check: ValidationCheck; report: string } {
  type Row = { key: string; title: string; credits: string; attributes: string; kind: string; source: string };
  const rows: Row[] = [];
  const variableCredit: Row[] = [];

  // AC-B03 states the population: courses with affiliation "PO" in the FINISHED
  // catalog. Three independent measurements of "the same" check produced three
  // different answers because they were three different populations (ADR-020),
  // so the scope is now explicit rather than implied.
  const population = catalog.filter((c) => c.id.affiliation === "PO");

  for (const c of population) {
    const key = courseKey(c.id);
    // Consider what EITHER source claims. A tag the Registrar carries and
    // Coursedog does not is still an anomaly a human should see; checking only
    // one source hides half of them.
    const fromRegistrar = registrar?.get(key)?.attributes;
    const union = new Set<GeAttribute>([...c.attributes, ...(fromRegistrar ?? [])]);
    const areas = [...union].filter(isArea);
    const source = fromRegistrar === undefined
      ? "coursedog"
      : areas.every((a) => c.attributes.includes(a))
        ? "both"
        : c.attributes.filter(isArea).length === 0
          ? "registrar"
          : "both";
    const credits = c.credits.min === c.credits.max ? String(c.credits.min) : `${c.credits.min}–${c.credits.max}`;
    const attributes = union.size > 0 ? [...union].sort().join(", ") : "—";

    if (c.id.courseNumber >= 190 && c.id.courseNumber <= 199 && areas.length > 0) {
      rows.push({ key, title: c.title, credits, attributes, kind: "senior exercise (190–199) with an Area tag", source });
    }
    // AC-B03: `credits.min < 1` — "may be taken at partial credit", not "is
    // always partial". The engine applies no partial-credit exclusion of its own
    // (none of the six Area rules carries `partialCredit: exclude`, by design,
    // because the Registrar has already applied the catalog's exclusions when
    // tagging). That makes the tag load-bearing, so the case worth surfacing is
    // the one where trusting it could produce a wrong answer: GEOL 189V PO at
    // 0.5-1 credits carrying AREA_4, counted toward an Area at half credit.
    // Both sub-groups are COUNTED; they are labelled so the owner can tell
    // "always partial" from "may be partial" at a glance.
    if (c.credits.min < 1 && areas.some((a) => a !== "AREA_6")) {
      const alwaysPartial = c.credits.max < 1;
      const row = {
        key, title: c.title, credits, attributes, source,
        kind: alwaysPartial
          ? "partial credit with a non-Area-6 Area tag (always partial)"
          : "partial credit with a non-Area-6 Area tag (may be taken at partial credit)",
      };
      rows.push(row);
      if (!alwaysPartial) variableCredit.push(row);
    }
    if (areas.length > 1) {
      rows.push({ key, title: c.title, credits, attributes, kind: "two areas", source });
    }
  }

  rows.sort((a, b) => a.key.localeCompare(b.key) || a.kind.localeCompare(b.kind));
  const byKind: Record<string, number> = {};
  for (const r of rows) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;

  variableCredit.sort((a, b) => a.key.localeCompare(b.key));

  const report = [
    "# Exclusion anomalies",
    "",
    "## Population",
    "",
    `Courses with \`affiliation: "PO"\` in the finished catalog: **${population.length}** `
      + `of ${catalog.length} total (AC-B03, ADR-020).`,
    "",
    "The counts below are **whatever the data says**, recorded as a baseline. They are",
    "not tuned to reach a figure: the v0 criterion's 3 and 10 came from the project",
    "brief's measurement of 2,811 raw Coursedog records, which is a different",
    "population from this 12-campus catalog, and three independent measurements of",
    "\"the same\" check produced three different answers.",
    "",
    `**${rows.length}** anomaly/anomalies.`,
    "",
    ...Object.entries(byKind).map(([k, n]) => `- ${k}: **${n}**`),
    "",
    "## How to resolve",
    "",
    "The catalog states that senior exercises (190–199), independent studies, Critical",
    "Inquiry and lower-division language courses carry no Area tag, and that partial-credit",
    "courses count only toward Area 6. Every row below contradicts one of those rules in",
    "the source data. The engine deliberately applies no exclusion logic of its own, so",
    "these are fixed upstream or accepted as genuine exceptions — not patched in code.",
    "",
    "| Course | Title | Credits | Attributes | Anomaly | Tagged by |",
    "|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.key} | ${r.title} | ${r.credits} | ${r.attributes} | ${r.kind} | ${r.source} |`),
    "",
    "## Variable-credit sub-group (counted above, listed again here)",
    "",
    "These are the `credits.min < 1` cases that are NOT always partial — a course",
    "offered at, say, 0.5-1 credits. They are included in the count above; this",
    "section exists so the owner can tell \"always partial\" from \"may be taken at",
    "partial credit\" at a glance, because the two need different conversations.",
    "",
    "Why they count: the engine applies no partial-credit exclusion of its own, so",
    "the Registrar's tag is load-bearing. A variable-credit course carrying an Area",
    "tag can be counted toward that Area at half credit, which is precisely where",
    "trusting the tag could produce a wrong answer (reviewer H-4).",
    "",
    ...(variableCredit.length === 0
      ? ["_None._", ""]
      : ["| Course | Title | Credits | Attributes |", "|---|---|---|---|",
         ...variableCredit.map((r) => `| ${r.key} | ${r.title} | ${r.credits} | ${r.attributes} |`), ""]),
  ].join("\n");

  return {
    check: {
      id: "exclusion-anomalies",
      status: rows.length === 0 ? "pass" : "warn",
      summary: `${rows.length} exclusion anomaly/anomalies across ${population.length} PO courses`
        + (variableCredit.length > 0 ? `; ${variableCredit.length} variable-credit course(s) reported separately` : ""),
      count: rows.length,
      details: rows.slice(0, 20).map((r) => `${r.key}: ${r.kind} (${r.attributes})`),
    },
    report,
  };
}
