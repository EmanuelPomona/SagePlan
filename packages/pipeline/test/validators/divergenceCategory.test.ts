import { describe, expect, test } from "vitest";
import type { GeAttribute } from "@gradguide/shared";
import { categoriseDivergence, DIVERGENCE_CATEGORIES } from "../../src/validators/divergenceCategory.ts";

const cat = (coursedog: GeAttribute[], registrar: GeAttribute[], present = true) =>
  categoriseDivergence(coursedog, registrar, present).id;

describe("categoriseDivergence", () => {
  test("Registrar carries an overlay the catalog lacks", () => {
    expect(cat(["AREA_2"], ["AREA_2", "SPEAKING_INTENSIVE"])).toBe("overlay-only-in-registrar");
  });

  test("the catalog carries an overlay the Registrar lacks", () => {
    expect(cat(["AREA_2", "SPEAKING_INTENSIVE"], ["AREA_2"])).toBe("overlay-only-in-coursedog");
  });

  test("Registrar carries an Area the catalog lacks", () => {
    expect(cat([], ["AREA_3"])).toBe("area-only-in-registrar");
  });

  test("the catalog carries an Area the Registrar lacks", () => {
    expect(cat(["AREA_3"], [])).toBe("area-only-in-coursedog");
  });

  test("the two sources name different Areas", () => {
    expect(cat(["AREA_3"], ["AREA_2"])).toBe("area-mismatch");
  });

  test("Areas and overlays both differ while the sets still overlap", () => {
    // AC-P09 lists "disjoint sets" as its own shape, so "mixed" is reserved for
    // sets that differ in both dimensions AND still share something.
    expect(cat(["AREA_2", "AREA_3"], ["AREA_2", "WRITING_INTENSIVE"])).toBe("mixed");
  });

  test("areas and overlays differing with NO overlap is the disjoint shape", () => {
    expect(cat(["AREA_3"], ["AREA_2", "WRITING_INTENSIVE"])).toBe("disjoint-sets");
  });

  test("a course the Registrar export does not list at all", () => {
    expect(cat(["AREA_1"], [], true, )).toBe("area-only-in-coursedog");
    expect(categoriseDivergence(["AREA_1"], [], false).id).toBe("missing-from-registrar-export");
  });

  test("a Registrar-tagged course the catalog does not contain", () => {
    expect(categoriseDivergence([], ["AREA_1"], true, true).id).toBe("missing-from-catalog");
  });

  test("every category carries a non-empty verdict on which source is likelier right", () => {
    for (const c of Object.values(DIVERGENCE_CATEGORIES)) {
      expect(c.likelierCorrect.length).toBeGreaterThan(0);
      expect(c.why.length).toBeGreaterThan(20);
    }
  });

  test("every id in the table matches its key, so the report cannot mislabel a row", () => {
    for (const [key, c] of Object.entries(DIVERGENCE_CATEGORIES)) expect(c.id).toBe(key);
  });

  test("identical sets are not a divergence at all", () => {
    expect(categoriseDivergence(["AREA_2"], ["AREA_2"], true).id).toBe("none");
  });
});

describe("the shapes AC-P09 names, and the unclassified bucket", () => {
  test("disjoint sets are their own shape, not 'mixed'", () => {
    expect(cat(["AREA_3"], ["WRITING_INTENSIVE"])).toBe("disjoint-sets");
  });

  test("overlapping-but-differing sets are 'mixed', not 'disjoint'", () => {
    expect(cat(["AREA_2", "AREA_3"], ["AREA_2", "WRITING_INTENSIVE"])).toBe("mixed");
  });

  test("an empty side is not disjoint — it is an only-in shape", () => {
    expect(cat([], ["AREA_3"])).toBe("area-only-in-registrar");
    expect(cat(["AREA_3"], [])).toBe("area-only-in-coursedog");
  });

  test("every shape AC-P09 names is reachable", () => {
    const reached = new Set([
      cat(["AREA_3"], ["AREA_2"]),
      cat(["AREA_2", "WRITING_INTENSIVE"], ["AREA_2"]),
      cat(["AREA_2"], ["AREA_2", "WRITING_INTENSIVE"]),
      cat(["AREA_4"], []),
      cat([], ["AREA_4"]),
      cat(["AREA_3"], ["WRITING_INTENSIVE"]),
    ]);
    expect(reached).toEqual(new Set([
      "area-mismatch", "overlay-only-in-coursedog", "overlay-only-in-registrar",
      "area-only-in-coursedog", "area-only-in-registrar", "disjoint-sets",
    ]));
  });

  test("the unclassified bucket exists and says why it must stay empty", () => {
    expect(DIVERGENCE_CATEGORIES["unclassified"]!.why).toContain("empty");
  });
});
