import { readFileSync } from "node:fs";
import type { ValidationCheck } from "@sageplan/shared";
import { generatedArtefacts } from "./artefactFiles.ts";

/**
 * Validator 1 — every emitted artefact re-parses against the shared contract.
 * The pipeline validates before writing, so a failure here means the file was
 * changed after the fact, or a schema moved under us. Hard fail either way.
 */
export function checkArtefactSchemas(dataDir: string): { check: ValidationCheck; report: string } {
  const issues: string[] = [];
  let checked = 0;

  for (const file of generatedArtefacts(dataDir)) {
    checked++;
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(readFileSync(file.path, "utf8"));
    } catch (e) {
      issues.push(`${file.rel}: not valid JSON (${(e as Error).message})`);
      continue;
    }
    const result = file.schema.safeParse(parsedJson);
    if (!result.success) {
      for (const issue of result.error.issues.slice(0, 20)) {
        issues.push(`${file.rel}: ${issue.path.join(".") || "(root)"} — ${issue.message}`);
      }
    }
  }

  const details = issues.slice(0, 20);
  return {
    check: {
      id: "artefact-schemas",
      status: issues.length > 0 ? "fail" : "pass",
      summary: `${checked} generated artefact(s) checked, ${issues.length} schema issue(s)`,
      count: issues.length,
      details,
    },
    report: ["# Artefact schema validation", "", `${checked} file(s) checked, ${issues.length} issue(s).`, "", ...details.map((d) => `- ${d}`), ""].join("\n"),
  };
}
