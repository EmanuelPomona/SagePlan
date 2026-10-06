import { PLAN_SCHEMA_VERSION, StudentPlanSchema, type StudentPlan } from "@sageplan/shared";

export type MigrateResult =
  | { ok: true; plan: StudentPlan }
  | { ok: false; reason: "newer" | "invalid"; detail: string };

/**
 * Everything entering the app from outside itself goes through here: localStorage,
 * an imported file, a share link. The student's record is the one thing this app
 * cannot afford to mangle, so a plan it does not understand is refused with a
 * specific reason and the original is left untouched (docs/API.md section 6).
 */
export function migratePlan(raw: unknown): MigrateResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "invalid", detail: "This file does not contain a plan." };
  }

  const version = (raw as { schemaVersion?: unknown }).schemaVersion;
  if (typeof version === "number" && version > PLAN_SCHEMA_VERSION) {
    return {
      ok: false,
      reason: "newer",
      detail: `This plan was saved by a newer version of GradGuide (format ${version}, this app reads ${PLAN_SCHEMA_VERSION}). Open it in the newer version instead.`,
    };
  }

  // No older versions exist yet. When they do, upgrade steps go here, in order,
  // before the parse below.
  const parsed = StudentPlanSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.join(".") ?? "";
    return {
      ok: false,
      reason: "invalid",
      detail: path ? `${path}: ${first?.message ?? "invalid"}` : (first?.message ?? "This plan could not be read."),
    };
  }

  return { ok: true, plan: parsed.data };
}
