import { PipelineError } from "./errors.ts";
import { runCatalog } from "./commands/catalog.ts";
import { runValidate } from "./commands/validate.ts";
import { runSections } from "./commands/sections.ts";
import { runHistory } from "./commands/history.ts";
import { runManifest } from "./commands/manifest.ts";
import { runAll } from "./commands/all.ts";

type Command = "catalog" | "sections" | "history" | "validate" | "manifest" | "all";
const COMMANDS: Command[] = ["catalog", "sections", "history", "validate", "manifest", "all"];

export async function dispatch(argv: readonly string[]): Promise<void> {
  const [command, ...rest] = argv;
  if (command === undefined || !COMMANDS.includes(command as Command)) {
    throw new PipelineError(`usage: pipeline <${COMMANDS.join("|")}> [args]`, "CLI_BAD_ARGS");
  }
  switch (command as Command) {
    case "catalog":
      return runCatalog(rest);
    case "sections":
      return runSections(rest);
    case "history":
      return runHistory(rest);
    case "validate": {
      const checks = await runValidate(rest);
      const failed = checks.filter((c) => c.status === "fail");
      for (const c of checks) console.log(`  ${c.status.toUpperCase().padEnd(4)} ${c.id.padEnd(24)} ${c.summary}`);
      if (failed.length > 0) {
        throw new PipelineError(`${failed.length} validator(s) failed: ${failed.map((c) => c.id).join(", ")}`, "VALIDATION_FAILED");
      }
      return;
    }
    case "manifest":
      await runManifest(rest);
      return;
    case "all":
      return runAll(rest);
  }
}

export function reportFailure(e: unknown): void {
  if (e instanceof PipelineError) {
    const status = e.status !== undefined ? ` status=${e.status}` : "";
    console.error(`FAIL [${e.code}${status}] ${e.message}`);
    if (e.details !== undefined) console.error(JSON.stringify(e.details, null, 2).slice(0, 4000));
  } else {
    console.error(`FAIL [UNEXPECTED] ${(e as Error)?.stack ?? String(e)}`);
  }
}

const invokedPath = process.argv[1] ?? "";
if (invokedPath.endsWith("cli.ts")) {
  dispatch(process.argv.slice(2)).catch((e: unknown) => {
    reportFailure(e);
    process.exitCode = 1;
  });
}
