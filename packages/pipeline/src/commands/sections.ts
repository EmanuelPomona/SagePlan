import { join } from "node:path";
import { courseKey, parseTermCode, SectionsArtefactSchema, CatalogArtefactSchema, type Course, type Section, type TermId } from "@gradguide/shared";
import { readEnv, type PipelineEnv } from "../env.ts";
import { PipelineError } from "../errors.ts";
import type { FetchImpl } from "../http.ts";
import { makeMeta } from "../meta.ts";
import { log } from "../reports.ts";
import { writeArtefact } from "../write.ts";
import { readExistingCourses, readExistingMeta } from "../catalogMerge.ts";
import { fetchSections, sectionsUrl } from "../hyperschedule/client.ts";
import { courseFromSection, isSectionIssue, normaliseSection } from "../hyperschedule/normalise.ts";
import { mapGeCodes } from "../hyperschedule/geCodes.ts";

export interface SectionsOptions { env?: PipelineEnv; fetchImpl?: FetchImpl; minSections?: number }

export async function runSections(argv: readonly string[], opts: SectionsOptions = {}): Promise<void> {
  const env = opts.env ?? readEnv();
  // A floor of 1 is not a guard. FA2026 carries 2,159 sections live; 500 catches
  // a truncated or half-published response without tripping on a small term.
  const minSections = opts.minSections ?? 500;
  const termCodes = argv.filter((a) => !a.startsWith("--"));
  const terms = termCodes.length > 0 ? termCodes : env.terms;
  const fetchedAt = new Date().toISOString();

  const newCourses = new Map<string, Course>();
  const notPublished: string[] = [];
  let skippedSummer = 0;
  let badShape = 0;
  let termMismatch = 0;
  let unknownPomonaTotal = 0;
  // Nothing is written until EVERY requested term has been fetched and
  // normalised. Writing inside the loop meant a later term's failure left a
  // fresh sections file whose non-PO courses were never merged — a partial
  // refresh, which is exactly what "keep yesterday's data" forbids.
  const pending: { code: string; term: TermId; sections: Section[]; unknown: number }[] = [];

  for (const code of terms) {
    const term = parseTermCode(code);
    if (!term) throw new PipelineError(`'${code}' is not a term code (expected FA2026 / SP2027)`, "CLI_BAD_ARGS");

    let raw: unknown[];
    try {
      raw = await fetchSections(env, code, { fetchImpl: opts.fetchImpl });
    } catch (e) {
      // A term Hyperschedule has not published yet answers 404. That is an
      // expected state ahead of registration, not a broken pipeline: warn, skip
      // the term, and let the manifest omit it (TASK-013). An EMPTY array for a
      // term that DOES exist is different, and still a hard failure below.
      if (e instanceof PipelineError && e.status === 404) {
        notPublished.push(code);
        log("sections", { term: code, status: "not-published-yet", httpStatus: 404, action: "skipped" });
        continue;
      }
      throw e;
    }
    const sections: Section[] = [];
    const unknownPomona = new Set<string>();
    for (const r of raw) {
      const s = normaliseSection(r, term);
      if (isSectionIssue(s)) {
        // Counted separately: a mis-filed term is a data problem worth seeing,
        // and lumping it in with skipped summer terms hid the very case the
        // cross-check was added to catch.
        if (s.reason === "unsupported-term") skippedSummer++;
        else if (s.reason === "term-mismatch") termMismatch++;
        else badShape++;
        continue;
      }
      sections.push(s);
      for (const u of mapGeCodes(s.geCodes).unknownPomona) unknownPomona.add(u);

      if (s.course.affiliation !== "PO") {
        const c = courseFromSection(r, { catalogYear: env.catalogYear, fetchedAt });
        if (c) newCourses.set(courseKey(c.id), c);
      }
    }
    unknownPomonaTotal += unknownPomona.size;

    if (sections.length < minSections) {
      throw new PipelineError(
        `${code} returned ${sections.length} section(s), below the floor of ${minSections}; keeping yesterday's data`,
        "SECTIONS_EMPTY",
      );
    }

    pending.push({ code, term, sections, unknown: unknownPomona.size });
    log("sections.fetch", { term: code, fetched: raw.length, usable: sections.length, skippedSummer, termMismatch, badShape, unknownPomonaCodes: unknownPomona.size });
  }

  if (pending.length === 0) {
    throw new PipelineError(
      `none of the requested terms (${terms.join(", ")}) is published upstream; keeping yesterday's data`,
      "SECTIONS_NO_TERMS",
    );
  }

  for (const p of pending) {
    writeArtefact(
      join(env.dataDir, `sections-${p.code}.json`),
      { meta: makeMeta({ generator: `sections ${p.code}`, sourceUrl: sectionsUrl(env, p.code), fetchedAt, catalogYear: env.catalogYear }), term: p.term, sections: p.sections },
      SectionsArtefactSchema,
    );
    log("sections.write", { term: p.code, sections: p.sections.length, unknownPomonaCodes: p.unknown });
  }

  // Merge non-PO courses into the catalog. Only PO entries are protected:
  // TASK-012 requires the Coursedog record (richer — description, grade mode,
  // requisites) to survive untouched. Non-PO entries are REFRESHED, because
  // Hyperschedule is their only source and skipping them froze every 5C course
  // at whatever the first run happened to capture, including its GE tags.
  const catalogPath = join(env.dataDir, "catalog.json");
  const existing = readExistingCourses(catalogPath);
  if (existing.length === 0) {
    throw new PipelineError(`${catalogPath} is missing or invalid; run 'npm run pipeline:catalog' first`, "CATALOG_MISSING");
  }
  const byKey = new Map(existing.map((c) => [courseKey(c.id), c]));
  let added = 0;
  let refreshed = 0;
  for (const [key, course] of newCourses) {
    const existingEntry = byKey.get(key);
    if (existingEntry !== undefined && existingEntry.id.affiliation === "PO") continue;
    if (existingEntry === undefined) added++;
    else refreshed++;
    byKey.set(key, course);
  }
  const merged = [...byKey.values()].sort((a, b) => courseKey(a.id).localeCompare(courseKey(b.id)));

  // Keep the catalog's OWN provenance. This merge only tops the file up with
  // non-Pomona courses seen in the schedule; the catalog is fundamentally the
  // Coursedog artefact, and the UI renders meta.fetchedAt as "catalog data as
  // of". Stamping it with a Hyperschedule sourceUrl would make 2,005 Pomona
  // courses claim a source they did not come from. ArtefactMeta holds a single
  // sourceUrl, so the honest choice is the catalog's own.
  // readExistingCourses above has already thrown unless the catalog exists and
  // is valid, so its meta is always present here — no fallback branch to leave
  // untested.
  const meta = readExistingMeta(catalogPath);
  if (meta === null) {
    throw new PipelineError(`${catalogPath} has no readable provenance stamp`, "CATALOG_MISSING");
  }
  writeArtefact(catalogPath, { meta, courses: merged }, CatalogArtefactSchema);

  const byAff: Record<string, number> = {};
  for (const c of merged) byAff[c.id.affiliation] = (byAff[c.id.affiliation] ?? 0) + 1;
  log("sections.merge", { before: existing.length, after: merged.length, added, refreshed, unknownPomonaCodes: unknownPomonaTotal, ...byAff });
  if (notPublished.length > 0) {
    log("sections.warn", { notPublishedYet: notPublished.join(","), count: notPublished.length });
  }
}
