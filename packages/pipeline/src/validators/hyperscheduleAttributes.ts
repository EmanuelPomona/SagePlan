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
  /** Term files that could not be read; each one silently narrows this check. */
  unreadable: readonly string[] = [],
): { check: ValidationCheck; report: string } {
  const fromSections = new Map<string, Set<GeAttribute>>();
  // Campus-1 codes we do not recognise. These are the dangerous ones: an
  // unrecognised Pomona GE code is a GE attribute being dropped from every
  // course that carries it, so it must reach the report rather than a log line.
  const unknownPomona = new Map<string, Set<string>>();

  for (const s of sections) {
    const key = courseKey(s.course);
    const mapped = mapGeCodes(s.geCodes);
    const set = fromSections.get(key) ?? new Set<GeAttribute>();
    for (const a of mapped.attrs) set.add(a);
    fromSections.set(key, set);
    for (const code of mapped.unknownPomona) {
      const seen = unknownPomona.get(code) ?? new Set<string>();
      seen.add(key);
      unknownPomona.set(code, seen);
    }
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

  const unreadableLines = unreadable.map(
    (f) => `term file ${f} could not be read, so the courses it covers were NOT cross-checked`,
  );
  const unknownLines = [...unknownPomona.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([code, courses]) => `unrecognised Pomona course-area code "${code}" on ${courses.size} course(s), e.g. ${[...courses].slice(0, 3).join(", ")}`);

  const report = [
    "# Hyperschedule GE codes vs catalog attributes",
    "",
    `**${rows.length}** course(s) offered this term disagree between the catalog and the schedule.`,
    `**${unknownPomona.size}** unrecognised Pomona course-area code(s).`,
    "",
    ...(unreadableLines.length > 0 ? ["## Term files that could not be read", "", ...unreadableLines.map((l) => `- ${l}`), ""] : []),
    ...(unknownLines.length > 0
      ? ["## Unrecognised Pomona codes", "",
         "Each of these is a GE attribute being dropped from every course that carries it.",
         "Add it to `HYPERSCHEDULE_GE_CODES` in `packages/shared`, or to the known",
         "non-attribute list in `src/hyperschedule/geCodes.ts`, before the next run.", "",
         ...unknownLines.map((l) => `- ${l}`), ""]
      : []),
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
      status: rows.length === 0 && unknownPomona.size === 0 && unreadable.length === 0 ? "pass" : "warn",
      summary: `${rows.length} catalog/Hyperschedule GE disagreement(s), ${unknownPomona.size} unrecognised Pomona code(s)`,
      count: rows.length + unknownPomona.size + unreadable.length,
      details: [...unreadableLines, ...unknownLines, ...rows.map((r) => `${r.key}: catalog=${fmt(r.catalog)} sections=${fmt(r.sections)}`)].slice(0, 20),
    },
    report,
  };
}
