import { afterEach, describe, expect, test, vi } from "vitest";
import { loadManifest } from "../data/loadData.ts";

const manifest = {
  schemaVersion: 1,
  generatedAt: "2026-09-08T06:12:03Z",
  catalogYear: "2026-2027",
  catalog: { path: "/data/catalog.json", fetchedAt: "2026-09-08T06:11:41Z", courseCount: 40 },
  sections: [],
  offeringHistory: null,
  programs: [
    { id: "general-education-2026", path: "/data/programs/general-education-2026.json", kind: "general-education", name: "General Education", confidence: "verified" },
  ],
  externalCreditRules: { path: "/data/external-credit-rules.json" },
  upcomingTerms: [],
};

const respond = (body: unknown, init: ResponseInit = {}) =>
  vi.fn().mockResolvedValue(new Response(typeof body === "string" ? body : JSON.stringify(body), { status: 200, ...init }));

afterEach(() => vi.unstubAllGlobals());

describe("loadManifest", () => {
  test("a valid manifest loads", async () => {
    vi.stubGlobal("fetch", respond(manifest));
    const out = await loadManifest();

    expect(out.ok).toBe(true);
    if (out.ok) expect(out.value.catalogYear).toBe("2026-2027");
  });

  test("404 reports notFound and names the path, never a blank page", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));
    const out = await loadManifest();

    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error.kind).toBe("notFound");
      expect(out.error.path).toBe("/data/manifest.json");
    }
  });

  test("invalid JSON reports badJson", async () => {
    vi.stubGlobal("fetch", respond("{ this is not json"));
    const out = await loadManifest();

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.kind).toBe("badJson");
  });

  test("a schema mismatch reports schema and the first failing field path", async () => {
    vi.stubGlobal("fetch", respond({ ...manifest, catalogYear: "twenty twenty six" }));
    const out = await loadManifest();

    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error.kind).toBe("schema");
      expect(out.error.detail).toContain("catalogYear");
    }
  });

  test("a network failure reports network rather than throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const out = await loadManifest();

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.kind).toBe("network");
  });

  test("a 500 is reported, not treated as success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));
    const out = await loadManifest();

    expect(out.ok).toBe(false);
  });
});
