import { join } from "node:path";
import { compareTerms, OfferingHistoryArtefactSchema, parseTermCode, type TermId } from "@gradguide/shared";
import { readEnv, type PipelineEnv } from "../env.ts";
import { PipelineError } from "../errors.ts";
import type { FetchImpl } from "../http.ts";
import { makeMeta } from "../meta.ts";
import { log } from "../reports.ts";
import { writeArtefact } from "../write.ts";
import { fetchOfferingHistory, fetchTerms, historyUrl } from "../hyperschedule/client.ts";
import { normaliseHistory } from "../hyperschedule/normalise.ts";

export interface HistoryOptions { env?: PipelineEnv; fetchImpl?: FetchImpl; minCourses?: number }

export async function runHistory(argv: readonly string[], opts: HistoryOptions = {}): Promise<void> {
  const env = opts.env ?? readEnv();
  // Live FA2026 returns 1,416 courses; 500 catches a shape drift that silently
  // drops most records without tripping on a genuinely small term.
  const minCourses = opts.minCourses ?? 500;
  const code = argv.find((a) => !a.startsWith("--")) ?? env.terms[0] ?? "FA2026";
  const asOfTerm = parseTermCode(code);
  if (!asOfTerm) throw new PipelineError(`'${code}' is not a term code (expected FA2026)`, "CLI_BAD_ARGS");
  const fetchedAt = new Date().toISOString();

  const rawTerms = await fetchTerms(env, { fetchImpl: opts.fetchImpl });
  const knownTerms: TermId[] = [];
  let skipped = 0;
  for (const t of rawTerms) {
    const season = String(t.term).toUpperCase();
    if (season !== "FA" && season !== "SP") { skipped++; continue; }
    if (!knownTerms.some((k) => k.year === t.year && k.term === season)) knownTerms.push({ year: t.year, term: season });
  }
  knownTerms.sort(compareTerms);

  const raw = await fetchOfferingHistory(env, code, { fetchImpl: opts.fetchImpl });
  const history = normaliseHistory(raw);
  if (history.length < minCourses) {
    throw new PipelineError(
      `offering-history/${code} yielded ${history.length} course(s), below the floor of ${minCourses}; keeping yesterday's data`,
      "HISTORY_EMPTY",
    );
  }

  // Every term any course reports must appear in knownTerms, or the UI's ribbon
  // would have gaps the data actually knows about.
  for (const h of history) {
    for (const t of h.terms) {
      if (!knownTerms.some((k) => k.year === t.year && k.term === t.term)) knownTerms.push(t);
    }
  }
  knownTerms.sort(compareTerms);

  writeArtefact(
    join(env.dataDir, "offering-history.json"),
    { meta: makeMeta({ generator: `history ${code}`, sourceUrl: historyUrl(env, code), fetchedAt, catalogYear: env.catalogYear }), asOfTerm, knownTerms, history },
    OfferingHistoryArtefactSchema,
  );
  log("history", { term: code, courses: history.length, knownTerms: knownTerms.length, skippedNonFaSp: skipped });
}
