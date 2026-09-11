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
    // AC-B03 specifies `credits.max < 1` — always-partial-credit courses.
    if (c.credits.max < 1 && areas.some((a) => a !== "AREA_6")) {
      rows.push({ key, title: c.title, credits, attributes, kind: "partial credit with a non-Area-6 Area tag", source });
    }
    // Reported SEPARATELY, not folded into the count above. Reviewer H-4 called
    // `credits.max < 1` a bug because it skips a 0.5-1 course such as
    // GEOL 189V PO (AREA_4), which a student MAY take at half credit. AC-B03 as
    // restated specifies `max`, so `max` is what the headline count uses — but
    // dropping the H-4 case entirely would silently lose a reviewer finding, so
    // it gets its own section and the manager can fold it in or not.
    if (c.credits.max >= 1 && c.credits.min < 1 && areas.some((a) => a !== "AREA_6")) {
      variableCredit.push({ key, title: c.title, credits, attributes, kind: "variable credit, may be taken at partial credit", source });
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
    "## Variable-credit courses (reported, NOT counted above)",
    "",
    "AC-B03 specifies `credits.max < 1`, so a course offered at 0.5-1 credits is not",
    "in the headline count. Reviewer H-4 called that predicate a bug, because a",
    "student MAY take such a course at half credit, at which point the Area-6-only",
    "rule bites. Listed here so the finding is not lost; the manager decides whether",
    "to fold them into the criterion.",
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
