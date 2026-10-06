import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { SectionSchema, OfferingHistorySchema, CourseSchema, compareTerms, courseKey } from "@sageplan/shared";
import { normaliseSection, normaliseHistory, courseFromSection, isSectionIssue } from "../../src/hyperschedule/normalise.ts";

const sections = JSON.parse(readFileSync(new URL("../fixtures/hs-sections-sample.json", import.meta.url), "utf8")) as Record<string, unknown>[];
const history = JSON.parse(readFileSync(new URL("../fixtures/hs-history-sample.json", import.meta.url), "utf8")) as Record<string, unknown>[];
const CTX = { catalogYear: "2026-2027" as const, fetchedAt: "2026-09-08T12:00:00Z" };
const ok = (r: ReturnType<typeof normaliseSection>) => { if (isSectionIssue(r)) throw new Error(r.reason); return r; };

describe("normaliseSection", () => {
  test("every fixture section becomes a valid Section", () => {
    let validated = 0;
    for (const raw of sections) {
      const r = normaliseSection(raw, { year: 2026, term: "FA" });
      expect(isSectionIssue(r)).toBe(false);
      if (!isSectionIssue(r)) { expect(SectionSchema.safeParse(r).success).toBe(true); validated++; }
    }
    // Without this the loop could assert nothing and still pass.
    expect(validated).toBe(sections.length);
  });

  test("maps identity without re-parsing a string", () => {
    const s = ok(normaliseSection(sections[0]!, { year: 2026, term: "FA" }));
    expect(s.course.department).toBeTruthy();
    expect(Number.isInteger(s.course.courseNumber)).toBe(true);
  });

  test("carries the term", () => {
    const s = ok(normaliseSection(sections[0]!, { year: 2026, term: "FA" }));
    expect(s.term).toEqual({ year: 2026, term: "FA" });
  });

  test("renders the half-semester object as a string", () => {
    const halfRaw = sections.find((s) => (s.identifier as { half: unknown }).half !== null)!;
    const s = ok(normaliseSection(halfRaw, { year: 2026, term: "FA" }));
    expect(typeof s.half).toBe("string");
    expect(s.half).toMatch(/^[FS]/);
  });

  test("leaves half null for a full-semester section", () => {
    const fullRaw = sections.find((s) => (s.identifier as { half: unknown }).half === null)!;
    expect(ok(normaliseSection(fullRaw, { year: 2026, term: "FA" })).half).toBeNull();
  });

  test("converts schedules to meetings with seconds after midnight", () => {
    const s = ok(normaliseSection(sections[0]!, { year: 2026, term: "FA" }));
    expect(s.meetings.length).toBeGreaterThan(0);
    expect(s.meetings[0]!.startSec).toBeGreaterThanOrEqual(0);
    expect(s.meetings[0]!.endSec).toBeGreaterThan(s.meetings[0]!.startSec);
    expect(Array.isArray(s.meetings[0]!.days)).toBe(true);
  });

  test("joins several locations into one string", () => {
    const multi = sections.find((s) => ((s.schedules ?? []) as { locations?: string[] }[]).some((x) => (x.locations ?? []).length > 1));
    expect(multi, "fixture must contain a multi-location section").toBeDefined();
    expect(ok(normaliseSection(multi!, { year: 2026, term: "FA" })).meetings.some((m) => m.location.includes(","))).toBe(true);
  });

  test("reduces instructors to names", () => {
    const s = ok(normaliseSection(sections[0]!, { year: 2026, term: "FA" }));
    expect(s.instructors.every((i) => typeof i === "string")).toBe(true);
  });

  test("keeps the raw courseAreas as geCodes", () => {
    const s = ok(normaliseSection(sections[0]!, { year: 2026, term: "FA" }));
    expect(Array.isArray(s.geCodes)).toBe(true);
  });

  test("skips a term that is neither FA nor SP", () => {
    const summer = structuredClone(sections[0]!) as Record<string, unknown>;
    (summer.identifier as Record<string, unknown>).term = "SU";
    const r = normaliseSection(summer, { year: 2026, term: "FA" });
    expect(isSectionIssue(r)).toBe(true);
    if (isSectionIssue(r)) expect(r.reason).toBe("unsupported-term");
  });
});

describe("courseFromSection", () => {
  test("builds a valid Course for a non-Pomona section", () => {
    const hm = sections.find((s) => (s.identifier as { affiliation: string }).affiliation === "HM")!;
    const c = courseFromSection(hm, CTX);
    expect(c).not.toBeNull();
    expect(CourseSchema.safeParse(c).success).toBe(true);
  });

  test("takes attributes from Pomona GE codes only and drops other colleges' codes", () => {
    const raw = structuredClone(sections[0]!) as Record<string, unknown>;
    raw.courseAreas = ["1A4", "4HSA"];
    const c = courseFromSection(raw, CTX)!;
    expect(c.attributes).toEqual(["AREA_4"]);
  });

  test("uses the section's credits honestly, never fabricating 1", () => {
    const zero = sections.find((s) => s.credits === 0);
    expect(zero, "fixture must contain a 0-credit section").toBeDefined();
    const c = courseFromSection(zero!, CTX)!;
    expect(c.credits.min).toBe(0);
    expect(c.credits.max).toBe(0);
  });

  test("leaves description empty and prereqs null", () => {
    const c = courseFromSection(sections[0]!, CTX)!;
    expect(c.prereqText).toBeNull();
    expect(c.prereqRule).toBeNull();
  });

  test("stamps the catalog year and a Hyperschedule sourceUrl", () => {
    const c = courseFromSection(sections[0]!, CTX)!;
    expect(c.catalogYear).toBe("2026-2027");
    expect(c.sourceUrl).toContain("hyperschedule.io");
  });
});

describe("normaliseHistory", () => {
  const entries = normaliseHistory(history);

  test("produces valid OfferingHistory entries", () => {
    for (const e of entries) expect(OfferingHistorySchema.safeParse(e).success).toBe(true);
  });

  test("sorts each course's terms ascending", () => {
    for (const e of entries) {
      for (let i = 1; i < e.terms.length; i++) {
        expect(compareTerms(e.terms[i - 1]!, e.terms[i]!)).toBeLessThan(0);
      }
    }
  });

  test("keeps one entry per course", () => {
    const keys = entries.map((e) => courseKey(e.course));
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("drops terms that are neither FA nor SP", () => {
    for (const e of entries) for (const t of e.terms) expect(["FA", "SP"]).toContain(t.term);
  });
});

describe("normaliseSection term cross-check", () => {
  test("rejects a section filed under a different term than the one requested", () => {
    const r = normaliseSection(sections[0]!, { year: 2027, term: "SP" });
    expect(isSectionIssue(r)).toBe(true);
    if (isSectionIssue(r)) {
      expect(r.reason).toBe("term-mismatch");
      expect(r.detail).toContain("expected SP2027");
    }
  });
});

describe("courseFromSection credits honesty", () => {
  test("keeps a genuine 0-credit section at 0", () => {
    const raw = structuredClone(sections[0]!) as Record<string, unknown>;
    raw.credits = 0;
    const c = courseFromSection(raw, CTX)!;
    expect(c.credits.min).toBe(0);
  });

  // Guards finding 24: `credits ?? 0` turned "Hyperschedule did not tell us" into
  // "this course is worth zero credits", which then trips the partial-credit
  // exclusion validator for a course that may be worth one.
  test("refuses a section with no credit value rather than calling it 0", () => {
    const raw = structuredClone(sections[0]!) as Record<string, unknown>;
    delete raw.credits;
    expect(courseFromSection(raw, CTX)).toBeNull();
  });

  test("refuses a negative or non-finite credit value", () => {
    const neg = structuredClone(sections[0]!) as Record<string, unknown>;
    neg.credits = -1;
    expect(courseFromSection(neg, CTX)).toBeNull();
  });
});
