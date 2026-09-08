import { courseKey, type Course, type GeAttribute, type Section, type ValidationCheck } from "@gradguide/shared";
import { mapGeCodes } from "../hyperschedule/geCodes.ts";

const fmt = (a: readonly GeAttribute[]) => (a.length > 0 ? [...a].sort().join(", ") : "—");

/**
 * Validator 4 — Hyperschedule geCodes vs catalog attributes (docs/API.md section 4).
 *
 * A third independent record of the same fact. Codes are unioned across all
 * sections of a course, because a course may be tagged on one section and not
 * another. Other colleges' codes are excluded: they are not Pomona GE.
 */
export function checkHyperscheduleAttributes(
  catalog: readonly Course[],
  sections: readonly Section[],
): { check: ValidationCheck; report: string } {
  const fromSections = new Map<string, Set<GeAttribute>>();
  for (const s of sections) {
    const key = courseKey(s.course);
    const set = fromSections.get(key) ?? new Set<GeAttribute>();
    for (const a of mapGeCodes(s.geCodes).attrs) set.add(a);
    fromSections.set(key, set);
  }

  type Row = { key: string; title: string; catalog: GeAttribute[]; sections: GeAttribute[] };
  const rows: Row[] = [];
  for (const course of catalog) {
    const key = courseKey(course.id);
    const seen = fromSections.get(key);
    if (seen === undefined) continue; // not offered this term: nothing to compare
    const a = [...course.attributes].sort();
    const b = [...seen].sort();
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      rows.push({ key, title: course.title, catalog: course.attributes, sections: [...seen] });
    }
  }
  rows.sort((x, y) => x.key.localeCompare(y.key));

  const report = [
    "# Hyperschedule GE codes vs catalog attributes",
    "",
    `**${rows.length}** course(s) offered this term disagree between the catalog and the schedule.`,
    "",
    "## How to resolve",
    "",
    "Hyperschedule reflects what the Registrar published for the term; the catalog",
    "reflects the course record. A course retagged after the catalog was built shows",
    "up here first. Advisory only — the pipeline changes nothing automatically.",
    "",
    "| Course | Title | Catalog | Sections |",
    "|---|---|---|---|",
    ...rows.map((r) => `| ${r.key} | ${r.title} | ${fmt(r.catalog)} | ${fmt(r.sections)} |`),
    "",
  ].join("\n");

  return {
    check: {
      id: "hyperschedule-attributes",
      status: rows.length === 0 ? "pass" : "warn",
      summary: `${rows.length} catalog/Hyperschedule GE disagreement(s)`,
      count: rows.length,
      details: rows.slice(0, 20).map((r) => `${r.key}: catalog=${fmt(r.catalog)} sections=${fmt(r.sections)}`),
    },
    report,
  };
}
