import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkArtefactSchemas } from "../../src/validators/schema.ts";
import { checkProvenance } from "../../src/validators/provenance.ts";
import { checkManifest } from "../../src/validators/manifest.ts";
import { checkSourceQuotes, extractSnapshotText, normaliseQuote } from "../../src/validators/sourceQuotes.ts";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "gg-val-")); mkdirSync(dir, { recursive: true }); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const meta = (over: Record<string, unknown> = {}) => ({
  schemaVersion: 1, generator: "test", generatedAt: "2026-09-08T00:00:00Z",
  fetchedAt: "2026-09-08T00:00:00Z", sourceUrl: "https://x.test/a", catalogYear: "2026-2027", ...over,
});
const course = () => ({
  id: { department: "CSCI", courseNumber: 51, suffix: "", affiliation: "PO" },
  title: "T", description: "", department: "CSCI",
  credits: { min: 1, max: 1, repeatable: false, maxRepeats: 0 },
  attributes: [], gradeMode: "", prereqText: null, prereqRule: null,
  catalogYear: "2026-2027", sourceUrl: "https://catalog.pomona.edu/x", lastVerified: "2026-09-08T00:00:00Z",
});
const writeCatalog = (over: Record<string, unknown> = {}) =>
  writeFileSync(join(dir, "catalog.json"), JSON.stringify({ meta: meta(), courses: [course()], ...over }));

describe("checkArtefactSchemas (validator 1)", () => {
  test("passes when every generated file re-parses", () => {
    writeCatalog();
    const { check } = checkArtefactSchemas(dir);
    expect(check.status).toBe("pass");
  });

  test("fails on a corrupted artefact and names the file", () => {
    writeFileSync(join(dir, "catalog.json"), JSON.stringify({ meta: meta(), courses: [{ ...course(), credits: "wrong" }] }));
    const { check } = checkArtefactSchemas(dir);
    expect(check.status).toBe("fail");
    expect(check.details.join(" ")).toContain("catalog.json");
  });

  test("fails on a file that is not JSON at all", () => {
    writeFileSync(join(dir, "catalog.json"), "<html>");
    expect(checkArtefactSchemas(dir).check.status).toBe("fail");
  });

  test("reports at most twenty issues", () => {
    writeFileSync(join(dir, "catalog.json"), JSON.stringify({ meta: meta(), courses: Array.from({ length: 40 }, () => ({ nope: 1 })) }));
    expect(checkArtefactSchemas(dir).check.details.length).toBeLessThanOrEqual(20);
  });
});

describe("checkProvenance (validator 6)", () => {
  test("passes when every artefact carries a full meta", () => {
    writeCatalog();
    expect(checkProvenance(dir).check.status).toBe("pass");
  });

  test("fails when fetchedAt is missing", () => {
    const m = meta(); delete (m as Record<string, unknown>).fetchedAt;
    writeCatalog({ meta: m });
    const { check } = checkProvenance(dir);
    expect(check.status).toBe("fail");
    expect(check.details.join(" ")).toContain("fetchedAt");
  });

  test("fails when sourceUrl is missing", () => {
    const m = meta(); delete (m as Record<string, unknown>).sourceUrl;
    writeCatalog({ meta: m });
    expect(checkProvenance(dir).check.status).toBe("fail");
  });

  test("fails when catalogYear is missing", () => {
    const m = meta(); delete (m as Record<string, unknown>).catalogYear;
    writeCatalog({ meta: m });
    expect(checkProvenance(dir).check.status).toBe("fail");
  });
});

describe("checkManifest (validator 8)", () => {
  const manifest = (over: Record<string, unknown> = {}) => ({
    schemaVersion: 1, generatedAt: "2026-09-08T00:00:00Z", catalogYear: "2026-2027",
    catalog: { path: "/data/catalog.json", fetchedAt: "2026-09-08T00:00:00Z", courseCount: 1 },
    sections: [], offeringHistory: null, programs: [], externalCreditRules: { path: "/data/external-credit-rules.json" },
    upcomingTerms: [], ...over,
  });

  test("fails when the manifest is absent", () => {
    expect(checkManifest(dir).check.status).toBe("fail");
  });

  test("fails when a listed path does not exist", () => {
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest()));
    const { check } = checkManifest(dir);
    expect(check.status).toBe("fail");
    expect(check.details.join(" ")).toContain("catalog.json");
  });

  test("passes when every listed path exists", () => {
    writeCatalog();
    writeFileSync(join(dir, "external-credit-rules.json"), "{}");
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest()));
    expect(checkManifest(dir).check.status).toBe("pass");
  });

  test("fails when an upcomingTerm has no sections file", () => {
    writeCatalog();
    writeFileSync(join(dir, "external-credit-rules.json"), "{}");
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest({ upcomingTerms: ["FA2026"] })));
    const { check } = checkManifest(dir);
    expect(check.status).toBe("fail");
    expect(check.details.join(" ")).toContain("FA2026");
  });
});

describe("normaliseQuote", () => {
  test("collapses whitespace and normalises smart punctuation", () => {
    expect(normaliseQuote("The  student must\n\ntake  it")).toBe("The student must take it");
    expect(normaliseQuote("“quoted” and ‘single’")).toBe('"quoted" and \'single\'');
  });
});

describe("extractSnapshotText", () => {
  test("renders a course anchor as its id", () => {
    const html = '<h1>Title</h1><p>Take <a data-course-id="ID 001 PO">Critical Inquiry</a> first.</p>';
    expect(extractSnapshotText(html)).toContain("ID 001 PO");
  });

  test("strips tags but keeps the text", () => {
    expect(extractSnapshotText("<h1>Degree</h1><p>Requirements</p>")).toContain("Degree");
  });
});

describe("checkSourceQuotes (validator 7)", () => {
  const programsDir = () => { const p = join(dir, "programs"); mkdirSync(p, { recursive: true }); return p; };
  const snapshotDir = () => { const p = join(dir, "sources", "catalog-pages"); mkdirSync(p, { recursive: true }); return p; };

  const setup = (quote: string, snapshotText: string) => {
    writeFileSync(join(snapshotDir(), "policy.txt"), snapshotText);
    writeFileSync(join(snapshotDir(), "index.json"), JSON.stringify([{ slug: "policy", url: "https://catalog.pomona.edu/pages/x", title: "t", fetchedAt: "2026-09-08T00:00:00Z", sha256: "", chars: snapshotText.length }]));
    writeFileSync(join(programsDir(), "ge.json"), JSON.stringify({
      id: "ge", requirements: [{ id: "r1", sourceQuote: quote, sourceRef: { slug: "policy" } }],
    }));
  };

  test("passes when the quote is a whitespace-normalised substring of the snapshot", async () => {
    setup("must complete   ten courses", "The student must complete ten courses in residence.");
    const { check } = await checkSourceQuotes(dir, { fetchImpl: vi.fn().mockResolvedValue(new Response("", { status: 500 })) });
    expect(check.status).not.toBe("fail");
  });

  test("fails when a quote is not in its snapshot", async () => {
    setup("must complete ninety courses", "The student must complete ten courses in residence.");
    const { check } = await checkSourceQuotes(dir, { fetchImpl: vi.fn().mockResolvedValue(new Response("", { status: 500 })) });
    expect(check.status).toBe("fail");
    expect(check.details.join(" ")).toContain("r1");
  });

  test("warns, never fails, when the network is unavailable", async () => {
    setup("must complete ten courses", "The student must complete ten courses in residence.");
    const { check } = await checkSourceQuotes(dir, { fetchImpl: vi.fn().mockRejectedValue(new Error("offline")) });
    expect(check.status).toBe("warn");
  });

  test("warns when a page's only quote is absent from the live page", async () => {
    // With a single quote we cannot tell "this rule went stale" from "this page
    // renders client-side", so the conservative page-level warning is correct.
    // The quote-level case is covered below, where a sibling quote IS readable.
    setup("must complete ten courses", "The student must complete ten courses in residence.");
    const { check } = await checkSourceQuotes(dir, {
      fetchImpl: vi.fn().mockImplementation(() => Promise.resolve(
        new Response("<h1>x</h1><p>The student must complete twelve courses in residence.</p>", { status: 200 }))),
    });
    expect(check.status).toBe("warn");
    expect(check.details.some((d) => d.includes("rendered client-side"))).toBe(true);
  });

  test("stays silent when the live page still contains the quote", async () => {
    setup("must complete ten courses", "The student must complete ten courses in residence.");
    const { check } = await checkSourceQuotes(dir, {
      fetchImpl: vi.fn().mockImplementation(() => Promise.resolve(
        new Response("<h1>x</h1><p>The student must complete ten courses in residence.</p>", { status: 200 }))),
    });
    expect(check.status).toBe("pass");
  });
});

describe("checkSourceQuotes on a client-rendered page", () => {
  const programsDir = () => { const p = join(dir, "programs"); mkdirSync(p, { recursive: true }); return p; };
  const snapshotDir = () => { const p = join(dir, "sources", "catalog-pages"); mkdirSync(p, { recursive: true }); return p; };

  test("reports one page-level warning instead of one per quote when nothing is readable", async () => {
    const snap = "Alpha requirement text. Beta requirement text.";
    writeFileSync(join(snapshotDir(), "tabs.txt"), snap);
    writeFileSync(join(snapshotDir(), "index.json"), JSON.stringify([{ slug: "tabs", url: "https://catalog.pomona.edu/pages/x", title: "t", fetchedAt: "2026-09-08T00:00:00Z", sha256: "", chars: snap.length }]));
    writeFileSync(join(programsDir(), "ge.json"), JSON.stringify({
      id: "ge",
      requirements: [
        { id: "a", sourceQuote: "Alpha requirement text.", sourceRef: { slug: "tabs" } },
        { id: "b", sourceQuote: "Beta requirement text.", sourceRef: { slug: "tabs" } },
      ],
    }));
    const { check } = await checkSourceQuotes(dir, {
      fetchImpl: vi.fn().mockImplementation(() => Promise.resolve(new Response("<h1>Shell</h1><p>Nothing useful here.</p>", { status: 200 }))),
    });
    expect(check.status).toBe("warn");
    const pageLevel = check.details.filter((d) => d.includes("rendered client-side"));
    expect(pageLevel).toHaveLength(1);
    expect(check.details.filter((d) => d.includes("NOT found on the live"))).toHaveLength(0);
  });

  test("still flags a single genuinely stale quote when its siblings are readable", async () => {
    const snap = "Alpha requirement text. Beta requirement text.";
    writeFileSync(join(snapshotDir(), "tabs.txt"), snap);
    writeFileSync(join(snapshotDir(), "index.json"), JSON.stringify([{ slug: "tabs", url: "https://catalog.pomona.edu/pages/x", title: "t", fetchedAt: "2026-09-08T00:00:00Z", sha256: "", chars: snap.length }]));
    writeFileSync(join(programsDir(), "ge.json"), JSON.stringify({
      id: "ge",
      requirements: [
        { id: "a", sourceQuote: "Alpha requirement text.", sourceRef: { slug: "tabs" } },
        { id: "b", sourceQuote: "Beta requirement text.", sourceRef: { slug: "tabs" } },
      ],
    }));
    const { check } = await checkSourceQuotes(dir, {
      fetchImpl: vi.fn().mockImplementation(() => Promise.resolve(new Response("<h1>x</h1><p>Alpha requirement text.</p>", { status: 200 }))),
    });
    expect(check.details.filter((d) => d.includes("NOT found on the live"))).toHaveLength(1);
  });
});
