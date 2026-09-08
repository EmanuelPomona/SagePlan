import { join } from "node:path";
import { courseKey, parseTermCode, SectionsArtefactSchema, CatalogArtefactSchema, type Course, type Section } from "@gradguide/shared";
import { readEnv, type PipelineEnv } from "../env.ts";
import { PipelineError } from "../errors.ts";
import type { FetchImpl } from "../http.ts";
import { makeMeta } from "../meta.ts";
import { log } from "../reports.ts";
import { writeArtefact } from "../write.ts";
import { readExistingCourses } from "../catalogMerge.ts";
import { fetchSections, sectionsUrl } from "../hyperschedule/client.ts";
import { courseFromSection, isSectionIssue, normaliseSection } from "../hyperschedule/normalise.ts";
import { mapGeCodes } from "../hyperschedule/geCodes.ts";

export interface SectionsOptions { env?: PipelineEnv; fetchImpl?: FetchImpl; minSections?: number }

export async function runSections(argv: readonly string[], opts: SectionsOptions = {}): Promise<void> {
  const env = opts.env ?? readEnv();
  const minSections = opts.minSections ?? 1;
  const termCodes = argv.filter((a) => !a.startsWith("--"));
  const terms = termCodes.length > 0 ? termCodes : env.terms;
  const fetchedAt = new Date().toISOString();

  const newCourses = new Map<string, Course>();
  const notPublished: string[] = [];
  const written: string[] = [];
  let skippedTerms = 0;
  let unknownPomonaTotal = 0;

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
      if (isSectionIssue(s)) { if (s.reason === "unsupported-term") skippedTerms++; continue; }
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

    writeArtefact(
      join(env.dataDir, `sections-${code}.json`),
      { meta: makeMeta({ generator: `sections ${code}`, sourceUrl: sectionsUrl(env, code), fetchedAt, catalogYear: env.catalogYear }), term, sections },
      SectionsArtefactSchema,
    );
    written.push(code);
    log("sections", { term: code, fetched: raw.length, written: sections.length, skippedSummer: skippedTerms, unknownPomonaCodes: unknownPomona.size });
  }

  if (written.length === 0) {
    throw new PipelineError(
      `none of the requested terms (${terms.join(", ")}) is published upstream; keeping yesterday's data`,
      "SECTIONS_NO_TERMS",
    );
  }

  // Merge non-PO courses into the catalog. Anything already present wins: the
  // Coursedog record is richer (description, grade mode, requisites), and
  // TASK-012 requires PO entries to be untouched.
  const catalogPath = join(env.dataDir, "catalog.json");
  const existing = readExistingCourses(catalogPath);
  if (existing.length === 0) {
    throw new PipelineError(`${catalogPath} is missing or invalid; run 'npm run pipeline:catalog' first`, "CATALOG_MISSING");
  }
  const byKey = new Map(existing.map((c) => [courseKey(c.id), c]));
  let added = 0;
  for (const [key, course] of newCourses) {
    if (byKey.has(key)) continue;
    byKey.set(key, course);
    added++;
  }
  const merged = [...byKey.values()].sort((a, b) => courseKey(a.id).localeCompare(courseKey(b.id)));

  const meta = makeMeta({ generator: "sections merge", sourceUrl: sectionsUrl(env, terms[0] ?? "FA2026"), fetchedAt, catalogYear: env.catalogYear });
  writeArtefact(catalogPath, { meta, courses: merged }, CatalogArtefactSchema);

  const byAff: Record<string, number> = {};
  for (const c of merged) byAff[c.id.affiliation] = (byAff[c.id.affiliation] ?? 0) + 1;
  log("sections.merge", { before: existing.length, after: merged.length, added, unknownPomonaCodes: unknownPomonaTotal, ...byAff });
  if (notPublished.length > 0) {
    log("sections.warn", { notPublishedYet: notPublished.join(","), count: notPublished.length });
  }
}
