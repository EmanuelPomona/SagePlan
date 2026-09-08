---
id: TASK-013
title: Manifest, validation report, source-quote validator, and the nightly pipeline workflow
status: READY
owner: backend
branch: agent/backend
priority: HIGH
round: 0
depends_on: [TASK-010, TASK-011, TASK-012]
blocked_on: ""
---

# TASK-013 — Manifest, full validation, nightly workflow

## Objective

Make the pipeline whole: `npm run pipeline:manifest` writes `data/manifest.json`
(`Manifest`); `npm run pipeline:validate` runs validators 1–8 from
`docs/API.md` §4 and writes `data/reports/validation.json` (`ValidationReport`)
plus the Markdown reports; `npm run pipeline:all` runs catalog → sections →
history → validate → manifest, stopping at the first failure; and
`.github/workflows/pipeline.yml` runs `pipeline:all` nightly and opens a pull
request when `data/` changed, with the reports in the PR body. It never pushes
to `main`.

## Scope

Create only:

```
packages/pipeline/src/commands/manifest.ts        run(): reads what is on disk, writes data/manifest.json (upcomingTerms = PIPELINE_TERMS that have a sections file, ascending)
packages/pipeline/src/commands/validate.ts        run(): validators 1-8, writes data/reports/validation.json and the .md reports, exit 1 on any fail
packages/pipeline/src/commands/all.ts             run(): the sequence above with a summary table at the end
packages/pipeline/src/validators/schema.ts        checkArtefactSchemas(): re-parses every generated file (validator 1)
packages/pipeline/src/validators/provenance.ts    checkProvenance(): every artefact has meta with fetchedAt/sourceUrl/catalogYear (validator 6)
packages/pipeline/src/validators/sourceQuotes.ts  checkSourceQuotes(): re-fetches each URL in data/sources/catalog-pages/index.json, re-extracts text with the same rules as the snapshot (see index.json titles), diffs against the snapshot, and checks every sourceQuote in data/programs/*.json and external-credit-rules.json is a whitespace-normalised substring (validator 7). Network failure -> warn, not fail; changed page text -> warn with a diff summary; quote not found in the committed snapshot -> fail.
packages/pipeline/src/validators/manifest.ts      checkManifest(): every listed path exists and validates; every upcomingTerms entry has a sections file (validator 8)
.github/workflows/pipeline.yml                    nightly cron (06:00 UTC), workflow_dispatch, Node 22, npm ci, `npm run pipeline:all`, then peter-evans/create-pull-request (or gh CLI) on diff; concurrency group; never push to main
packages/pipeline/test/commands/*.test.ts, test/validators/*.test.ts
```

Modify: `packages/pipeline/src/cli.ts` (wire `validate`, `manifest`, `all`).

## Interfaces

**Consumes:** everything TASK-010/011/012 produce; `ManifestSchema`, `ValidationReportSchema`, `ValidationCheckSchema`, `SCHEMAS` from shared; the snapshot rules in `data/sources/catalog-pages/index.json` (Nuxt payload tabs are extracted from the `window.__NUXT__` string literals beginning `<h1>`, with `<a data-course-id>` anchors rendered as their id; see the manager's extraction in `docs/status/main.md` history, and `packages/shared/scripts/validate-artefacts.ts` for the normalisation function to reuse).

**Produces:** `data/manifest.json` (the first file the app loads), `data/reports/validation.json`, the nightly PR.

## Tests to write first

1. `manifest.test.ts`: given a temp `data/` with catalog, two sections files and programs, the manifest lists them with correct counts and `upcomingTerms` ascending; a term in `PIPELINE_TERMS` without a sections file is omitted with a warn.
2. `validate.test.ts`: a corrupted `sections-FA2026.json` (one field wrong) → validator 1 fails, exit 1, other reports still written; a missing `meta.fetchedAt` → validator 6 fails.
3. `sourceQuotes.test.ts`: a program fixture with a quote not in its snapshot → fail; a changed upstream page (injected fetch) → warn with the diff summary; offline (fetch throws) → warn.
4. `all.test.ts` (injected commands): failure in `sections` stops before `manifest`; the summary table names the failing step.

## Acceptance Criteria

- [ ] AC-B06 / AC-I01: `scripts/contract-test.sh` exits **0** on a fresh clone after `npm run pipeline:all` (paste the tail of its output).
- [ ] AC-P08: a run with `COURSEDOG_ORIGIN=https://wrong.example` exits non-zero and `git status --porcelain data/` is empty afterwards.
- [ ] AC-B03: `data/reports/validation.json` validates against `ValidationReportSchema` and contains eight checks by id.
- [ ] AC-B07: the workflow file passes `actionlint` or a manual review checklist pasted into the handoff; a `workflow_dispatch` run on the branch opens a PR (paste the URL) or, if Actions cannot run on the fork, paste the `act` output and say so under What Was NOT Verified.
- [ ] `npm run seed` (root, = contract:artefacts) exits 0.
- [ ] Typecheck, lint, tests pass at root.

## Notes

- Skills: `ecc:deployment-patterns` is optional for the workflow; required: `superpowers:test-driven-development` for validators, `ecc:error-handling`, `superpowers:requesting-code-review`, `superpowers:verification-before-completion`.
- Nightly safety: `pipeline:all` must never write a partial set. Write every artefact to `data/.staging/` first and move them all at the end, or verify each `writeArtefact` is atomic and abort before `manifest` on any failure (the manifest is what the app trusts).
- PR body: the summary table plus links to each report file. Title `data: nightly refresh <YYYY-MM-DD>`.
- This task completes the "fails loudly, keeps yesterday's data" promise; say in the handoff exactly how you proved it.

## Review History

| Round | Verdict | Summary |
|---|---|---|
