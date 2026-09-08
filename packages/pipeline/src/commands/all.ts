import { readEnv, type PipelineEnv } from "../env.ts";
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
 * Order matters: the manifest is what the app trusts, so it is written last and
 * only after validation passed. If any earlier step fails we stop with
 * yesterday's manifest still in place, which is the "fails loudly, keeps
 * yesterday's data" promise.
 */
export async function runAll(_argv: readonly string[] = [], opts: AllOptions = {}): Promise<void> {
  const env = opts.env ?? readEnv();
  const steps: Step[] = opts.steps ?? [
    { name: "catalog", run: () => runCatalog([], { env }) },
    { name: "sections", run: () => runSections(env.terms, { env }) },
    { name: "history", run: () => runHistory([env.terms[0] ?? "FA2026"], { env }) },
    {
      name: "validate",
      run: async () => {
        const checks = await runValidate([], { env, manifestPending: true });
        const failed = checks.filter((c) => c.status === "fail");
        if (failed.length > 0) {
          throw new PipelineError(
            `${failed.length} validator(s) failed: ${failed.map((c) => `${c.id} (${c.summary})`).join("; ")}`,
            "VALIDATION_FAILED",
          );
        }
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

  if (failedAt !== null) throw new PipelineError(`pipeline:all stopped at '${failedAt}'; yesterday's data is untouched`, "PIPELINE_FAILED");
}
