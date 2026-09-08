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

  for (const c of catalog) {
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
    if (c.credits.max < 1 && areas.some((a) => a !== "AREA_6")) {
      rows.push({ key, title: c.title, credits, attributes, kind: "partial credit with a non-Area-6 Area tag", source });
    }
    if (areas.length > 1) {
      rows.push({ key, title: c.title, credits, attributes, kind: "two areas", source });
    }
  }

  rows.sort((a, b) => a.key.localeCompare(b.key) || a.kind.localeCompare(b.kind));
  const byKind: Record<string, number> = {};
  for (const r of rows) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;

  const report = [
    "# Exclusion anomalies",
    "",
    `**${rows.length}** anomaly/anomalies across ${catalog.length} catalog courses.`,
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
  ].join("\n");

  return {
    check: {
      id: "exclusion-anomalies",
      status: rows.length === 0 ? "pass" : "warn",
      summary: `${rows.length} exclusion anomaly/anomalies for human review`,
      count: rows.length,
      details: rows.slice(0, 20).map((r) => `${r.key}: ${r.kind} (${r.attributes})`),
    },
    report,
  };
}
