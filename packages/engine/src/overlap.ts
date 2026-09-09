import type { OverlapPolicy, Requirement } from "@gradguide/shared";

/** Does this policy let the course also count for `otherId`? */
export function allowsSharingWith(policy: OverlapPolicy, otherId: string): boolean {
  switch (policy.kind) {
    case "allowAll":
      return true;
    case "exclusive":
      return false;
    case "allowOnly":
      return policy.requirementIds.includes(otherId);
    case "denyOnly":
      return !policy.requirementIds.includes(otherId);
  }
}

/**
 * A course may count for both requirements only when BOTH policies allow it.
 * Sharing is symmetric: one `exclusive` side is enough to forbid it.
 */
export function mayShare(a: Requirement, b: Requirement): boolean {
  if (a.id === b.id) return true;
  return allowsSharingWith(a.overlapPolicy, b.id) && allowsSharingWith(b.overlapPolicy, a.id);
}
