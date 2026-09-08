import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ValidationCheck } from "@gradguide/shared";
import { generatedArtefacts } from "./artefactFiles.ts";

/**
 * Validator 2 — the non-empty guard, asserted against what is ON DISK.
 *
 * The commands already refuse to WRITE an empty artefact (that is where the
 * "keep yesterday's data" promise lives). This is the belt-and-braces check
 * that nothing emptied a file afterwards, and it is what puts validator 2 in
 * data/reports/validation.json alongside the other seven.
 */
export function checkNonEmpty(dataDir: string, minCourses = 2000, expectedTerms: readonly string[] = []): { check: ValidationCheck; report: string } {
  const issues: string[] = [];
  const counts: string[] = [];

  for (const file of generatedArtefacts(dataDir)) {
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(readFileSync(file.path, "utf8")) as Record<string, unknown>;
    } catch {
      issues.push(`${file.rel}: unreadable`);
      continue;
    }
    const collections: [string, unknown][] = [["courses", json.courses], ["sections", json.sections], ["history", json.history]];
    for (const [name, value] of collections) {
      if (!Array.isArray(value)) continue;
      counts.push(`${file.rel}: ${value.length} ${name}`);
      if (value.length === 0) issues.push(`${file.rel}: ${name} is empty`);
      if (name === "courses" && value.length < minCourses) {
        issues.push(`${file.rel}: only ${value.length} courses, below the floor of ${minCourses}`);
      }
    }
  }

  // An artefact that is simply ABSENT passes every other check: generatedArtefacts
  // is existsSync-gated, the manifest omits the term, and validator 8 only checks
  // that listed files exist. A whole term can vanish without rising above a log line.
  for (const term of expectedTerms) {
    if (!existsSync(join(dataDir, `sections-${term}.json`))) {
      counts.push(`sections-${term}.json: absent (configured in PIPELINE_TERMS)`);
    }
  }

  return {
    check: {
      id: "non-empty",
      status: issues.length > 0 ? "fail" : "pass",
      summary: issues.length === 0 ? `every generated artefact is non-empty (${counts.length} collection(s))` : `${issues.length} empty or undersized artefact(s)`,
      count: issues.length,
      details: issues.length > 0 ? issues.slice(0, 20) : counts.slice(0, 20),
    },
    report: ["# Non-empty guard", "", ...counts.map((c) => `- ${c}`), "", ...issues.map((i) => `- **${i}**`), ""].join("\n"),
  };
}
