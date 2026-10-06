import type { StudentPlan } from "@sageplan/shared";

/** Readable on purpose: a student may open this file to check what it holds. */
export function planToJson(plan: StudentPlan): string {
  return `${JSON.stringify(plan, null, 2)}\n`;
}

export function exportFilename(plan: StudentPlan, date: Date): string {
  const iso = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  return `gradguide-plan-${plan.catalogYear}-${iso}.json`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * A download that never touches the network: the file is built in memory and
 * handed to the browser as an object URL, which is revoked immediately after.
 */
export function download(plan: StudentPlan, now = new Date()): void {
  const blob = new Blob([planToJson(plan)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = exportFilename(plan, now);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
