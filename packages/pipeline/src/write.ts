import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { z } from "zod";
import { PipelineError } from "./errors.ts";

/**
 * Validate, then write atomically.
 *
 * The nightly promise is "fails loudly, keeps yesterday's data" — so validation
 * happens BEFORE anything touches the destination, and the bytes land via a
 * temp file + rename so a crash mid-write can never leave a half-written
 * artefact where the app expects a whole one.
 */
export function writeArtefact<T>(path: string, value: unknown, schema: z.ZodType<T>, pretty = false): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new PipelineError(
      `refusing to write ${path}: value does not match its schema`,
      "ARTEFACT_INVALID",
      undefined,
      parsed.error.issues.slice(0, 20),
    );
  }

  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `.${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  try {
    writeFileSync(tmp, JSON.stringify(parsed.data, null, pretty ? 2 : 0), "utf8");
    renameSync(tmp, path);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw new PipelineError(`failed writing ${path}: ${(e as Error).message}`, "ARTEFACT_WRITE_FAILED");
  }
  return parsed.data;
}
