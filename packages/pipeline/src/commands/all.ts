import { readEnv, type PipelineEnv } from "../env.ts";
import type { ValidationCheck } from "@gradguide/shared";
import { PipelineError } from "../errors.ts";
import { log } from "../reports.ts";
import { runCatalog } from "./catalog.ts";
import { runSections } from "./sections.ts";
import { runHistory } from "./history.ts";
import { runValidate } from "./validate.ts";
import { runManifest } from "./manifest.ts";
import { checkManifest } from "../validators/manifest.ts";

export interface Step { name: string; run: () => Promise<unknown> }
export interface AllOptions { env?: PipelineEnv; steps?: Step[] }

/**
 * The nightly sequence, stopping at the FIRST failure.
 *
 * Order matters: the MANIFEST is what the app trusts, so it is written last and
 * only after validation passed.
 *
 * Be precise about what that guarantees. Each artefact is written atomically by
 * its own step (TASK-013 sanctions this over a staging directory), so a failed
 * run never leaves a half-written FILE. It can, however, leave a newly written
 * catalog or sections file alongside YESTERDAY'S manifest — the guarantee is
 * that the manifest never points at data that failed validation, not that /data
 * is byte-for-byte unchanged. The workflow reinforces this by committing nothing
 * unless the whole sequence exits 0.
 */
/**
 * Fail the run when any validator reported a hard failure. Extracted so the
 * enforcement itself is testable: injecting fake steps only ever proved that a
 * for-loop stops on a throw.
 */
export function assertNoFailures(checks: readonly ValidationCheck[]): void {
  const failed = checks.filter((c) => c.status === "fail");
  if (failed.length > 0) {
    throw new PipelineError(
      `${failed.length} validator(s) failed: ${failed.map((c) => `${c.id} (${c.summary})`).join("; ")}`,
      "VALIDATION_FAILED",
    );
  }
}

/** The real nightly sequence, in order. Exported so its shape can be asserted. */
export function defaultSteps(env: PipelineEnv): Step[] {
  return [
    { name: "catalog", run: () => runCatalog([], { env }) },
    { name: "sections", run: () => runSections(env.terms, { env }) },
    { name: "history", run: () => runHistory([env.terms[0] ?? "FA2026"], { env }) },
    {
      name: "validate",
      run: async () => {
        assertNoFailures(await runValidate([], { env, manifestPending: true }));
      },
    },
    { name: "manifest", run: () => runManifest([], { env }) },
    {
      // The manifest is the first file the app loads and the one it trusts, so
      // it gets a final consistency gate after it is written.
      name: "verify",
      run: async () => {
        const { check } = checkManifest(env.dataDir);
        if (check.status === "fail") {
          throw new PipelineError(`manifest is inconsistent with what is on disk: ${check.details.join("; ")}`, "MANIFEST_INCONSISTENT");
        }
        log("verify", { manifest: check.status, issues: check.count });
      },
    },
  ];
}

export async function runAll(_argv: readonly string[] = [], opts: AllOptions = {}): Promise<void> {
  const env = opts.env ?? readEnv();
  const steps: Step[] = opts.steps ?? defaultSteps(env);

  const results: { name: string; status: "ok" | "failed" | "skipped"; detail: string }[] = [];
  let failedAt: string | null = null;

  for (const step of steps) {
    if (failedAt !== null) { results.push({ name: step.name, status: "skipped", detail: `not run: ${failedAt} failed` }); continue; }
    const started = Date.now();
    try {
      await step.run();
      results.push({ name: step.name, status: "ok", detail: `${Date.now() - started}ms` });
    } catch (e) {
      failedAt = step.name;
      results.push({ name: step.name, status: "failed", detail: e instanceof PipelineError ? `${e.code}: ${e.message}` : String((e as Error).message) });
    }
  }

  console.log("\n  step        status   detail");
  console.log("  ----------  -------  ------------------------------------------");
  for (const r of results) console.log(`  ${r.name.padEnd(10)}  ${r.status.padEnd(7)}  ${r.detail.slice(0, 80)}`);
  console.log("");
  log("all", { steps: results.length, ok: results.filter((r) => r.status === "ok").length, failed: failedAt ?? "none" });

  if (failedAt !== null) {
    throw new PipelineError(
      `pipeline:all stopped at '${failedAt}'. The manifest was not updated, so the app still reads the last validated dataset; nothing is committed.`,
      "PIPELINE_FAILED",
    );
  }
}
