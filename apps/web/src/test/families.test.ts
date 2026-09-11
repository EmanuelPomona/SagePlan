import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { evaluate } from "@gradguide/engine";
import { CatalogArtefactSchema, ProgramSchema, emptyPlan } from "@gradguide/shared";
import type { Course, Program, StudentPlan, StudentType } from "@gradguide/shared";
import { ADMINISTRATIVE, FAMILIES, familyOf, isAdministrative, mapFamilies } from "../map/families.ts";

const at = (rel: string) => resolve(__dirname, rel);
const GE: Program = ProgramSchema.parse(JSON.parse(readFileSync(at("../../../../data/programs/general-education-2026.json"), "utf8")));
const CATALOG: Course[] = CatalogArtefactSchema.parse(JSON.parse(readFileSync(at("../../dev-fixtures/catalog.json"), "utf8"))).courses;

const planFor = (studentType: StudentType): StudentPlan => emptyPlan("2026-2027", null, studentType);
const nodesFor = (studentType: StudentType) => {
  const plan = planFor(studentType);
  return mapFamilies(GE.requirements, evaluate(plan, [GE], CATALOG), plan);
};

describe("every requirement is accounted for", () => {
  test("each one is either in a family or administrative, with nothing left over", () => {
    const unaccounted = GE.requirements
      .map((r) => r.id)
      .filter((id) => familyOf(id) === null && !isAdministrative(id));

    expect(unaccounted).toEqual([]);
  });

  test("and nothing is in both", () => {
    const both = GE.requirements.map((r) => r.id).filter((id) => familyOf(id) !== null && isAdministrative(id));
    expect(both).toEqual([]);
  });

  test("the mapping does not name requirements the program does not have", () => {
    const known = new Set(GE.requirements.map((r) => r.id));
    const named = [...FAMILIES.flatMap((f) => f.requirementIds), ...ADMINISTRATIVE];

    expect(named.filter((id) => !known.has(id))).toEqual([]);
  });
});

describe("how many nodes each student actually gets", () => {
  test("a first-year gets twelve", () => {
    expect(nodesFor("firstYear").flatMap((f) => f.nodes)).toHaveLength(12);
  });

  /**
   * MEASURED, and it disagrees with TASK-033's parenthetical.
   *
   * The task says twelve for a transfer student too, "the PE variant swaps in,
   * the waived one drops out": but TWO family requirements are waived for a
   * transfer student, not one: critical-inquiry AND physical-education. The
   * brief is explicit that a waived requirement is not drawn as a node, so the
   * honest count is eleven. Flagged in the handoff rather than padded back to
   * twelve by drawing a requirement that does not apply to them.
   */
  test("a transfer student gets ELEVEN: critical-inquiry is waived for them as well as PE", () => {
    const families = nodesFor("transfer");
    expect(families.flatMap((f) => f.nodes)).toHaveLength(11);
    expect(families.flatMap((f) => f.nodes.map((n) => n.requirement.id))).not.toContain("critical-inquiry");
  });

  test("the transfer PE variant lands in Foundations", () => {
    const foundations = nodesFor("transfer").find((f) => f.name === "Foundations")!;
    const ids = foundations.nodes.map((n) => n.requirement.id);

    expect(ids).toContain("physical-education-transfer");
    expect(ids).not.toContain("physical-education");
  });

  test("a first-year sees the ordinary PE requirement instead", () => {
    const ids = nodesFor("firstYear").find((f) => f.name === "Foundations")!.nodes.map((n) => n.requirement.id);

    expect(ids).toContain("physical-education");
    expect(ids).not.toContain("physical-education-transfer");
  });

  test("a waived requirement is never drawn as a node", () => {
    const transfer = nodesFor("transfer").flatMap((f) => f.nodes);
    expect(transfer.every((n) => n.result.waived !== true)).toBe(true);
  });
});

describe("family shape", () => {
  test("families come back in reading order with the right sizes", () => {
    const families = nodesFor("firstYear");
    expect(families.map((f) => `${f.name}:${f.nodes.length}`)).toEqual(["Breadth:6", "Overlays:3", "Foundations:3"]);
    // And for a transfer student, Foundations holds two.
    expect(nodesFor("transfer").map((f) => `${f.name}:${f.nodes.length}`)).toEqual(["Breadth:6", "Overlays:3", "Foundations:2"]);
  });

  test("administrative requirements are never nodes", () => {
    const ids = nodesFor("firstYear").flatMap((f) => f.nodes.map((n) => n.requirement.id));
    expect(ids.filter(isAdministrative)).toEqual([]);
  });
});
