import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ValidationCheck } from "@sageplan/shared";
import type { FetchImpl } from "../http.ts";

/**
 * The SAME normalisation packages/shared/scripts/validate-artefacts.ts uses.
 * Smart punctuation is folded because the catalog renders curly quotes while
 * the hand-written JSON often carries straight ones.
 */
export function normaliseQuote(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Re-extract readable text from a catalog page the same way the committed
 * snapshots were made: course anchors collapse to their course id, tags are
 * dropped, entities are decoded.
 */
export function extractSnapshotText(html: string): string {
  let s = html;
  const nuxt = /<h1>[\s\S]*$/.exec(s);
  if (nuxt) s = nuxt[0];
  s = s.replace(/<a[^>]*data-course-id="([^"]+)"[^>]*>[\s\S]*?<\/a>/g, (_m, id: string) => id);
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = s
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"').replace(/&ldquo;/g, '"');
  return normaliseQuote(s);
}

interface QuoteRef { owner: string; quote: string; slug: string }

function collectQuotes(dataDir: string): { refs: QuoteRef[]; errors: string[] } {
  const refs: QuoteRef[] = [];
  const errors: string[] = [];
  const push = (owner: string, node: unknown) => {
    const n = node as { sourceQuote?: unknown; sourceRef?: { slug?: unknown } };
    if (typeof n?.sourceQuote === "string" && typeof n?.sourceRef?.slug === "string") {
      refs.push({ owner, quote: n.sourceQuote, slug: n.sourceRef.slug });
    }
  };
  const programsDir = join(dataDir, "programs");
  if (existsSync(programsDir)) {
    for (const f of readdirSync(programsDir).filter((x) => x.endsWith(".json"))) {
      let p: Record<string, unknown>;
      try {
        p = JSON.parse(readFileSync(join(programsDir, f), "utf8")) as Record<string, unknown>;
      } catch (e) {
        errors.push(`programs/${f} could not be parsed (${(e as Error).message}); its quotes were not checked`);
        continue;
      }
      for (const r of (p.requirements as unknown[]) ?? []) push(`programs/${f}#${(r as { id?: string }).id ?? "?"}`, r);
      for (const c of (p.constraints as unknown[]) ?? []) push(`programs/${f}#constraint`, c);
      for (const a of (p.advisories as unknown[]) ?? []) push(`programs/${f}#${(a as { id?: string }).id ?? "advisory"}`, a);
    }
  }
  const rulesPath = join(dataDir, "external-credit-rules.json");
  if (existsSync(rulesPath)) {
    try {
      const rules = JSON.parse(readFileSync(rulesPath, "utf8")) as { rules?: unknown[] };
      for (const r of rules.rules ?? []) push(`external-credit-rules.json#${(r as { id?: string }).id ?? "?"}`, r);
    } catch (e) {
      // Not silent: the artefact schema validator will fail this file too, but a
      // reader of THIS report needs to know its quote coverage was incomplete.
      errors.push(`external-credit-rules.json could not be parsed (${(e as Error).message}); its quotes were not checked`);
    }
  }
  return { refs, errors };
}

/**
 * Validator 7 — source quotes.
 *
 * Three outcomes, deliberately different:
 *   - quote not found in the COMMITTED snapshot -> FAIL. The encoded rule does
 *     not say what the catalog says, and that is a correctness bug we own.
 *   - upstream page text changed -> WARN with a diff summary. The catalog moved;
 *     a human re-reads it. Not our bug, and not something to fail CI nightly on.
 *   - network unavailable -> WARN. Never fail the build for being offline.
 */
export async function checkSourceQuotes(
  dataDir: string,
  opts: { fetchImpl?: FetchImpl; skipNetwork?: boolean } = {},
): Promise<{ check: ValidationCheck; report: string }> {
  const pagesDir = join(dataDir, "sources", "catalog-pages");
  const snapshots = new Map<string, string>();
  if (existsSync(pagesDir)) {
    for (const f of readdirSync(pagesDir).filter((x) => x.endsWith(".txt"))) {
      snapshots.set(f.replace(/\.txt$/, ""), normaliseQuote(readFileSync(join(pagesDir, f), "utf8")));
    }
  }

  const { refs, errors } = collectQuotes(dataDir);
  const failures: string[] = [...errors];
  const warnings: string[] = [];

  for (const ref of refs) {
    const snap = snapshots.get(ref.slug);
    if (snap === undefined) { failures.push(`${ref.owner}: sourceRef.slug "${ref.slug}" has no snapshot`); continue; }
    if (!snap.includes(normaliseQuote(ref.quote))) {
      failures.push(`${ref.owner}: sourceQuote is not a substring of ${ref.slug}.txt — "${ref.quote.slice(0, 70)}…"`);
    }
  }

  // Re-fetch each page and re-check the QUOTES against the live text.
  //
  // Deliberately not a whole-page equality diff: the snapshots were extracted
  // from a Nuxt payload whose shape has since changed, so an equality check
  // reports "changed" for every page every night and teaches everyone to ignore
  // this validator. The question that actually matters is narrower and stable:
  // does the catalog still say the thing we encoded?
  const indexPath = join(pagesDir, "index.json");
  const stale: string[] = [];
  if (!opts.skipNetwork && existsSync(indexPath)) {
    let entries: { slug: string; url: string }[] = [];
    try {
      entries = Object.values(JSON.parse(readFileSync(indexPath, "utf8")) as Record<string, { slug: string; url: string }>);
    } catch (e) {
      warnings.push(`catalog-pages/index.json could not be read (${(e as Error).message}); no page was re-verified live`);
    }
    const fetchImpl = opts.fetchImpl ?? (fetch as FetchImpl);
    const liveBySlug = new Map<string, string>();

    for (const e of entries) {
      if (!snapshots.has(e.slug)) continue;
      try {
        // Bounded like every other network call. Without a signal a page that
        // accepts the connection and never answers hangs the nightly job until
        // the workflow's 20-minute timeout, producing no PR and no report.
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30_000);
        let res: Response;
        try {
          res = await fetchImpl(e.url, { signal: controller.signal });
        } finally {
          clearTimeout(timer);
        }
        if (!res.ok) { warnings.push(`${e.slug}: upstream returned HTTP ${res.status}; quotes not re-verified live`); continue; }
        const fresh = extractSnapshotText(await res.text());
        if (fresh.length === 0) { warnings.push(`${e.slug}: re-extraction produced no text; quotes not re-verified live`); continue; }
        liveBySlug.set(e.slug, fresh);
      } catch (err) {
        warnings.push(`${e.slug}: could not re-fetch (${(err as Error).message}); quotes not re-verified live`);
      }
    }

    // Group by slug so a page we simply cannot read live produces ONE honest
    // warning rather than one per quote. Several catalog pages render their tab
    // content client-side, so the served HTML contains the shell only: if NOT
    // ONE of a page's quotes is present, the page was not readable, not stale.
    const bySlug = new Map<string, QuoteRef[]>();
    for (const ref of refs) {
      if (!liveBySlug.has(ref.slug)) continue;
      const list = bySlug.get(ref.slug) ?? [];
      list.push(ref);
      bySlug.set(ref.slug, list);
    }
    for (const [slug, slugRefs] of bySlug) {
      const live = liveBySlug.get(slug)!;
      const missing = slugRefs.filter((r) => !live.includes(normaliseQuote(r.quote)));
      if (missing.length === slugRefs.length && slugRefs.length > 0) {
        warnings.push(`${slug}: none of its ${slugRefs.length} quote(s) appear in the served HTML, so this page's text is rendered client-side and cannot be verified live; the committed snapshot remains the gate`);
        continue;
      }
      for (const r of missing) {
        stale.push(`${r.owner} (${slug})`);
        warnings.push(`${r.owner}: quote still matches the committed snapshot but was NOT found on the live ${slug} page; re-take the snapshot and re-read the rule`);
      }
    }
  }

  const status: ValidationCheck["status"] = failures.length > 0 ? "fail" : warnings.length > 0 ? "warn" : "pass";
  const report = [
    "# Source quotes",
    "",
    `${refs.length} quote(s) checked against ${snapshots.size} committed snapshot(s).`,
    `**${failures.length}** failure(s), **${warnings.length}** warning(s).`,
    "",
    "## How to resolve",
    "",
    "A FAILURE means an encoded requirement quotes text the committed snapshot does",
    "not contain — the rule and the catalog disagree, and the rule is wrong until",
    "proven otherwise. This gate works offline and is the one that matters.",
    "",
    "A WARNING means the live page could not be fetched, or a quote that still",
    "matches the snapshot was not found on the live page — the catalog has probably",
    "moved on. Re-take the snapshot and re-read the affected rules.",
    "",
    ...(failures.length > 0 ? ["## Failures", "", ...failures.map((f) => `- ${f}`), ""] : []),
    ...(warnings.length > 0 ? ["## Warnings", "", ...warnings.map((w) => `- ${w}`), ""] : []),
    ...(stale.length > 0 ? ["## Quotes no longer found on the live page", "", ...stale.map((c) => `- ${c}`), ""] : []),
  ].join("\n");

  return {
    check: {
      id: "source-quotes",
      status,
      summary: `${refs.length} quote(s): ${failures.length} not found in snapshot, ${warnings.length} warning(s)`,
      count: failures.length + warnings.length,
      details: [...failures, ...warnings].slice(0, 20),
    },
    report,
  };
}
