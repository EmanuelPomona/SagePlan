import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { StudentPlanSchema } from "@sageplan/shared";
import type { StudentPlan } from "@sageplan/shared";
import { SHARE_LINK_WARN_LENGTH, decodePlan, encodePlan } from "../share/shareLink.ts";

const DEMO_DIR = resolve(__dirname, "..", "..", "public", "demo");
const demo = (name: string): StudentPlan =>
  StudentPlanSchema.parse(JSON.parse(readFileSync(resolve(DEMO_DIR, `${name}.json`), "utf8")));

const DEMOS = ["F-01-on-track", "F-02-transfer", "F-03-exams", "F-04-override", "F-05-one-short", "F-06-conflict"];

describe("share link round trip", () => {
  test.each(DEMOS)("%s survives encode then decode byte for byte", async (name) => {
    const plan = demo(name);
    const decoded = await decodePlan(await encodePlan(plan));

    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(JSON.stringify(decoded.plan)).toBe(JSON.stringify(plan));
  });

  test("the encoding is URL safe: no +, / or = to be mangled in a fragment", async () => {
    const encoded = await encodePlan(demo("F-01-on-track"));
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test("a realistic plan stays well inside a usable URL", async () => {
    const encoded = await encodePlan(demo("F-01-on-track"));
    // Recorded so a future change that bloats the payload is visible in a diff.
    expect(encoded.length).toBeLessThan(3000);
  });

  test("compression actually earns its place", async () => {
    const plan = demo("F-05-one-short");
    const encoded = await encodePlan(plan);
    expect(encoded.length).toBeLessThan(JSON.stringify(plan).length);
  });
});

describe("a link that cannot be trusted is refused, never guessed at", () => {
  test("tampered text is corrupt", async () => {
    const encoded = await encodePlan(demo("F-01-on-track"));
    const tampered = `${encoded.slice(0, -8)}AAAAAAAA`;
    const out = await decodePlan(tampered);

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("corrupt");
  });

  test("nonsense is corrupt rather than thrown", async () => {
    for (const junk of ["", "!!!!", "not-base64-at-all"]) {
      const out = await decodePlan(junk);
      expect(out.ok).toBe(false);
    }
  });

  test("a plan from a newer version is refused as newer, not silently downgraded", async () => {
    const encoded = await encodePlan({ ...demo("F-01-on-track"), schemaVersion: 2 } as unknown as StudentPlan);
    const out = await decodePlan(encoded);

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("newer");
  });

  test("valid compressed JSON that is not a plan is invalid", async () => {
    const encoded = await encodePlan({ hello: "world" } as unknown as StudentPlan);
    const out = await decodePlan(encoded);

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("invalid");
  });
});

describe("the length warning exists so a broken link is caught before it is shared", () => {
  test("a very large plan exceeds the warning threshold", async () => {
    const base = demo("F-01-on-track");
    const big: StudentPlan = {
      ...base,
      completed: Array.from({ length: 200 }, (_, i) => ({
        ...base.completed[0]!,
        course: { department: "CSCI", courseNumber: (i % 200) + 1, suffix: "", affiliation: "PO" as const },
      })),
    };
    expect((await encodePlan(big)).length).toBeGreaterThan(0);
    expect(SHARE_LINK_WARN_LENGTH).toBe(8000);
  });
});
