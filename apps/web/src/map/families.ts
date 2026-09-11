import type { Requirement, Result, StudentPlan } from "@gradguide/shared";

export type FamilyName = "Breadth" | "Overlays" | "Foundations";

/**
 * The three families the owner identified, and the requirements that are not
 * families at all (ADR-011).
 *
 * Twelve nodes, because twelve is what a student actually chooses courses for.
 * Everything else is about totals, resolves itself, and nobody plans a semester
 * around it, so it gets the one-line strip rather than a node.
 */
export const FAMILIES: { name: FamilyName; requirementIds: string[] }[] = [
  { name: "Breadth", requirementIds: ["area-1", "area-2", "area-3", "area-4", "area-5", "area-6"] },
  { name: "Overlays", requirementIds: ["writing-intensive", "speaking-intensive", "analyzing-difference"] },
  { name: "Foundations", requirementIds: ["critical-inquiry", "language", "physical-education", "physical-education-transfer"] },
];

export const ADMINISTRATIVE = [
  "total-credits",
  "post-matriculation-credits",
  "post-matriculation-credits-transfer",
  "pomona-residency-credits",
];

const FAMILY_OF = new Map<string, FamilyName>(
  FAMILIES.flatMap((f) => f.requirementIds.map((id) => [id, f.name] as const)),
);

export function familyOf(requirementId: string): FamilyName | null {
  return FAMILY_OF.get(requirementId) ?? null;
}

export function isAdministrative(requirementId: string): boolean {
  return ADMINISTRATIVE.includes(requirementId);
}

export type MapNode = { requirement: Requirement; result: Result };
export type MapFamily = { name: FamilyName; nodes: MapNode[] };

/**
 * The nodes to draw, in family order.
 *
 * A requirement waived for this student is not drawn: it did not happen to
 * them, and a node is a thing you act on. It still appears in the detail rows,
 * last, so the fact of being excused is not hidden.
 */
export function mapFamilies(requirements: Requirement[], results: Result[], _plan: StudentPlan): MapFamily[] {
  const byId = new Map(requirements.map((r) => [r.id, r]));
  const resultById = new Map(results.map((r) => [r.requirementId, r]));

  return FAMILIES.map((family) => ({
    name: family.name,
    nodes: family.requirementIds.flatMap((id) => {
      const requirement = byId.get(id);
      const result = resultById.get(id);
      if (!requirement || !result || result.waived === true) return [];
      return [{ requirement, result }];
    }),
  }));
}
