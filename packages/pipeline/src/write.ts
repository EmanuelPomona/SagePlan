import { closeSync, fsyncSync, mkdirSync, openSync, readdirSync, renameSync, rmSync, unlinkSync, writeSync } from "node:fs";
import { dirname, join } from "node:path";
import type { z } from "zod";
import { PipelineError } from "./errors.ts";

const TEMP_PREFIX = ".gg-tmp-";
const TEMP_SUFFIX = ".tmp";
/**
 * Both temp shapes this code has ever produced: the current ".gg-tmp-<ts>-<rand>.tmp"
 * and the earlier ".<ts>-<rand>.tmp". Anchored and specific so the sweep can only
 * ever match a file we wrote — never a .gitkeep or an unrelated dotfile.
 */
const STALE_TEMP_RE = /^\.(gg-tmp-)?\d{10,}-[a-z0-9]+\.tmp$/;

/**
 * Remove temp files an earlier run abandoned. A SIGKILL between the write and
 * the rename orphans one, and nothing else in the pipeline scans for them
 * (readSections and the artefact list both require a real artefact name), so
 * they would accumulate in /data unnoticed. Named with our own prefix so this
 * can never touch a file we did not create.
 */
function sweepStaleTempFiles(dir: string): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (!STALE_TEMP_RE.test(name)) continue;
    try {
      unlinkSync(join(dir, name));
    } catch {
      // Another process may be mid-write; leaving it is harmless.
    }
  }
}

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
  sweepStaleTempFiles(dir);

  const tmp = join(dir, `${TEMP_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}${TEMP_SUFFIX}`);
  try {
    // fsync before rename. rename() is atomic in the directory, but without the
    // flush a machine crash can leave the entry pointing at unwritten blocks —
    // a zero-length or truncated artefact where the app expects a whole one.
    const fd = openSync(tmp, "w");
    try {
      writeSync(fd, JSON.stringify(parsed.data, null, pretty ? 2 : 0));
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, path);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw new PipelineError(`failed writing ${path}: ${(e as Error).message}`, "ARTEFACT_WRITE_FAILED");
  }
  return parsed.data;
}
