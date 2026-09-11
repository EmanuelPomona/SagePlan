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

  test("Areas and overlays both differ", () => {
    expect(cat(["AREA_3"], ["AREA_2", "WRITING_INTENSIVE"])).toBe("mixed");
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
