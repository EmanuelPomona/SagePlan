import type { RegistrarRow } from "../registrar/parseCsv.ts";
import { parseRegistrarCourseNumber } from "../registrar/pivot.ts";
import { courseKey } from "@sageplan/shared";

/**
 * D-12 (ADR-020) — the open question about `Measure Values = 2`.
 *
 * The task spec said `Measure Values` is 0/1. It is 0, 1 or 2, and every 2 sits
 * on `Physical Education`. `pivotRegistrar` tests `>= 1`, which is the only
 * reason AC-B02's `PE 241` holds — a literal `=== "1"` gives 222.
 *
 * What 2 MEANS is unconfirmed. It looks like "counts as two PE courses", but the
 * catalog says the requirement is two PE activity courses *in different
 * semesters*, which one course cannot be at any weight. Until the Registrar
 * answers, the pipeline records the fact and changes nothing: the nineteen
 * courses are listed here so the question can be asked with the data attached.
 */
export function doubleCreditPeReport(rows: readonly RegistrarRow[]): { count: number; report: string } {
  const seen = new Map<string, { key: string; title: string }>();
  for (const row of rows) {
    if (row.measureValue < 2) continue;
    const id = parseRegistrarCourseNumber(row.courseNumber);
    const key = id ? courseKey(id) : row.courseNumber.trim();
    if (!seen.has(key)) seen.set(key, { key, title: row.courseTitle });
  }
  const list = [...seen.values()].sort((a, b) => a.key.localeCompare(b.key));

  const report = [
    "# Registrar `Measure Values = 2` — double-weighted Physical Education",
    "",
    `**${list.length}** course(s) carry \`Measure Values = 2\`, all on \`Physical Education\`.`,
    "",
    "## The open question (DEBT D-12)",
    "",
    "The task spec stated that `Measure Values` is `0`/`1`. It is `0`, `1` or `2`.",
    "`pivotRegistrar` treats `>= 1` as present, which is the only reason AC-B02's",
    "`PE 241` holds; a literal `=== \"1\"` reading yields 222.",
    "",
    "**What `2` means is not confirmed.** The natural reading is \"the Registrar counts",
    "this as two PE courses\". But the catalog states the requirement as two physical",
    "education activity courses **in different semesters**, and no weight makes one",
    "course two semesters. So the reading cannot simply be applied.",
    "",
    "The pipeline therefore records the fact and changes nothing. If the Registrar",
    "confirms \"counts as two\", the shape backend proposed is an optional",
    "`attributeWeights` field on `Course` — additive, no `schemaVersion` bump.",
    "",
    "Until then a student who satisfied PE with one of these courses is told they",
    "still owe another. That is a known, recorded wrong answer, not a silent one.",
    "",
    "| Course | Title |",
    "|---|---|",
    ...list.map((c) => `| ${c.key} | ${c.title} |`),
    "",
  ].join("\n");

  return { count: list.length, report };
}
