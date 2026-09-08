import type { Program } from "@gradguide/shared";
import type { ResolvedCourse } from "./resolvedCourse.ts";

export type Assignment = Map<string, ResolvedCourse[]>;

/**
 * Cross-requirement constraints, as data (docs/API.md 2.3). P0 has one kind:
 * the catalog's rule that no two Breadth areas may be closed by courses from
 * the same department.
 */
export function constraintViolations(program: Program, assignment: Assignment): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const constraint of program.constraints ?? []) {
    if (constraint.kind !== "distinctDepartments") continue;

    const byDepartment = new Map<string, string[]>();
    for (const reqId of constraint.requirementIds) {
      for (const course of assignment.get(reqId) ?? []) {
        const dept = course.completed.course.department;
        const holders = byDepartment.get(dept) ?? [];
        if (!holders.includes(reqId)) holders.push(reqId);
        byDepartment.set(dept, holders);
      }
    }
    for (const holders of byDepartment.values()) {
      if (holders.length < 2) continue;
      for (const reqId of holders) {
        const list = out.get(reqId) ?? [];
        if (!list.includes(constraint.kind)) list.push(constraint.kind);
        out.set(reqId, list);
      }
    }
  }
  return out;
}

/**
 * Would assigning `course` to `reqId` break a distinctDepartments group?
 * Checked during assignment so the search avoids the violation rather than
 * reporting it afterwards.
 */
export function violatesConstraint(
  program: Program,
  reqId: string,
  course: ResolvedCourse,
  assignment: Assignment,
): boolean {
  for (const constraint of program.constraints ?? []) {
    if (constraint.kind !== "distinctDepartments") continue;
    if (!constraint.requirementIds.includes(reqId)) continue;

    for (const otherId of constraint.requirementIds) {
      if (otherId === reqId) continue;
      for (const held of assignment.get(otherId) ?? []) {
        if (held.completed.course.department === course.completed.course.department) return true;
      }
    }
  }
  return false;
}
