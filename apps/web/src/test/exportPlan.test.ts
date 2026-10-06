import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { StudentPlanSchema } from "@sageplan/shared";
import type { StudentPlan } from "@sageplan/shared";
import { exportFilename, planToJson } from "../share/exportPlan.ts";
import { migratePlan } from "../plan/migratePlan.ts";

const at = (rel: string) => resolve(__dirname, rel);
const demo = (name: string): StudentPlan =>
  StudentPlanSchema.parse(JSON.parse(readFileSync(at(`../../public/demo/${name}.json`), "utf8")));

describe("exportFilename", () => {
  test("names the catalog year and the day it was exported", () => {
    expect(exportFilename(demo("F-01-on-track"), new Date("2026-09-08T12:00:00Z")))
      .toBe("gradguide-plan-2026-2027-2026-09-08.json");
  });

  test("pads single-digit months and days", () => {
    expect(exportFilename(demo("F-01-on-track"), new Date("2027-01-05T00:00:00Z")))
      .toContain("2027-01-05");
  });
});

describe("exported text", () => {
  test("parses back to an identical plan", () => {
    const plan = demo("F-03-exams");
    const out = migratePlan(JSON.parse(planToJson(plan)));

    expect(out.ok).toBe(true);
    if (out.ok) expect(JSON.stringify(out.plan)).toBe(JSON.stringify(plan));
  });

  test("is readable rather than minified, because a student may open it", () => {
    expect(planToJson(demo("F-01-on-track"))).toContain("\n");
  });
});

describe("the demo plans are the engine's fixtures, not copies that can drift", () => {
  test.each([
    ["F-01-on-track", "F-01"], ["F-02-transfer", "F-02"], ["F-03-exams", "F-03"],
    ["F-04-override", "F-04"], ["F-05-one-short", "F-05"], ["F-06-conflict", "F-06"],
  ])("%s matches %s", (demoName, fixtureName) => {
    const shipped = JSON.parse(readFileSync(at(`../../public/demo/${demoName}.json`), "utf8"));
    const fixture = JSON.parse(readFileSync(at(`../../../../packages/engine/test/fixtures/plans/${fixtureName}.json`), "utf8"));
    expect(shipped).toEqual(fixture);
  });
});
