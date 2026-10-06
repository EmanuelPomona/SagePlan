---
id: TASK-012
title: Hyperschedule sections and offering-history ingestion; merge non-Pomona courses into the catalog
status: READY
owner: backend
branch: agent/backend
priority: HIGH
round: 1
depends_on: [TASK-010]
blocked_on: ""
---

# TASK-012 — Hyperschedule sections, offering history, 5C catalog merge

## Objective

`npm run pipeline:sections -- FA2026 SP2027` writes `data/sections-FA2026.json`
and `data/sections-SP2027.json` (`SectionsArtefact`); `npm run pipeline:history
-- FA2026` writes `data/offering-history.json` (`OfferingHistoryArtefact`). Both
come from Hyperschedule v4, fetched in CI only, never from a browser.

Second deliverable: **the catalog must contain every 5C course a Pomona
student can count toward GE**, not only Pomona's 2,811 (a Scripps course tagged
`1A2` satisfies Area 2). After sections are fetched, merge every non-PO course
seen in any section into `data/catalog.json` as a `Course` built from
Hyperschedule data: `title`, `credits` from the section's credit field,
`attributes` from `geCodes` via `HYPERSCHEDULE_GE_CODES`, `description: ""`,
`department` = subject code, `prereqText: null`, `prereqRule: null`,
`sourceUrl: https://hyperschedule.io/…` (or the Hyperschedule course URL), same
`catalogYear`. PO entries from Coursedog are never overwritten by this merge.

## Scope

Create only:

```
packages/pipeline/src/hyperschedule/client.ts     fetchTerms(env), fetchSections(env, termCode), fetchOfferingHistory(env, termCode), fetchCourseAreas(env)
packages/pipeline/src/hyperschedule/raw.ts        zod schemas for the raw v4 shapes we read
packages/pipeline/src/hyperschedule/normalise.ts  normaliseSection(raw, term): Section; normaliseHistory(raw): OfferingHistory; courseFromSection(raw): Course (for non-PO merge)
packages/pipeline/src/hyperschedule/geCodes.ts    mapGeCodes(codes: string[]): { attrs: GeAttribute[], nonPomona: string[], unknownPomona: string[] }
packages/pipeline/src/commands/sections.ts        run(argv: termCodes[]) -> writes sections-{TERM}.json, then merges non-PO courses into data/catalog.json
packages/pipeline/src/commands/history.ts         run(argv: [termCode]) -> writes offering-history.json with knownTerms from /v4/term/all
packages/pipeline/src/validators/hyperscheduleAttributes.ts  checkHyperscheduleAttributes(catalog, sections): { check, report }   (validator 4)
packages/pipeline/test/hyperschedule/*.test.ts
packages/pipeline/test/fixtures/hs-sections-sample.json    30 sections cut from /v4/sections/FA2026 incl. PO, HM, SC courses, a half-semester section, one with two GE codes
packages/pipeline/test/fixtures/hs-history-sample.json     20 courses from /v4/offering-history/FA2026
packages/pipeline/test/fixtures/hs-terms.json              the /v4/term/all response
```

Modify: `packages/pipeline/src/cli.ts` (wire `sections`, `history`);
`packages/pipeline/src/commands/catalog.ts` only if the preserve-non-PO logic
from TASK-010 needs a shared helper (put it in `src/catalogMerge.ts`).

## Interfaces

**Consumes:** `SectionSchema`, `OfferingHistorySchema`, `CourseSchema`, `TermIdSchema`, `parseTermCode`, `termCode`, `compareTerms`, `HYPERSCHEDULE_GE_CODES` from shared; `fetchJson`, `writeArtefact`, `makeMeta`, `env` from TASK-010.

**Produces:** `data/sections-{TERM}.json`, `data/offering-history.json`, non-PO courses in `data/catalog.json`; `checkHyperscheduleAttributes` for TASK-013.

## Upstream facts (brief §7B)

- Base `https://banana.hyperschedule.io`. `/v4/term/all` (every term back to ~2010), `/v4/course-areas` (209 area codes with descriptions), `/v4/sections/{term}` (e.g. `FA2026` → 2,158 sections, 2.3 MB), `/v4/offering-history/{term}` (1,415 courses).
- Pomona GE codes are campus-prefixed with `1`: `1A1`–`1A6`, `1WIR`, `1SIR`, `1ADR`, `1FL`, `1PE`, `1CP`, `1DDP` (DDP is not a GE attribute; drop it). Codes with other prefixes are other colleges' requirements; keep them out of `attributes` but leave them in `Section.geCodes`.
- Hyperschedule's course identity is decomposed exactly like `CourseId`; map field names, do not re-parse strings.
- Terms other than FA/SP (summer) exist upstream; skip them with a counted log line. `TermId.term` admits only `FA` and `SP`.
- Obligations: attribute Hyperschedule in the UI (frontend does), email the maintainers before public launch (owner does), never call from a browser (this task enforces by living in the pipeline).

## Tests to write first

1. `normalise.test.ts`: each fixture section → `Section` with `term`, `half`, `meetings[].startSec`, `geCodes`; a summer term is skipped; `courseFromSection` for an `HM` course yields attributes from `1A4` only and drops `4HSA`-style codes.
2. `geCodes.test.ts`: `["1A3","1ADR","2XX"]` → attrs `[AREA_3, ANALYZING_DIFFERENCE]`, nonPomona `["2XX"]`; `["1ZZZ"]` → unknownPomona (reported, never thrown away).
3. `history.test.ts`: fixture → `OfferingHistory[]` with terms ascending; `knownTerms` ascending and containing every term in any course's history.
4. `sections.command.test.ts` (injected fetch): empty sections for a requested term → throws, nothing written; a `SC` course appearing in sections is added to `catalog.json`; an existing PO course is unchanged after merge; output validates.
5. `hyperscheduleAttributes.test.ts`: a PO course whose catalog `attributes` lack an area that a section's `geCodes` carries → one divergence line; agreement → pass.

## Acceptance Criteria

- [ ] AC-B04: `npm run pipeline:sections -- FA2026 SP2027` writes both files with ≥ 2,000 sections for FA2026; pasted output shows counts, skipped summer terms, unknown-Pomona-code count.
- [ ] AC-B05: `npm run pipeline:history -- FA2026` writes `offering-history.json` with ≥ 1,400 courses and ascending `knownTerms`.
- [ ] `data/catalog.json` grows to include non-PO courses (paste the before/after count and the count per affiliation); every PO entry is byte-identical to before the merge (`jq` or a test proves it).
- [ ] `data/reports/hyperschedule-attribute-diff.md` exists after `npm run pipeline:validate`.
- [ ] Typecheck, lint, tests pass at root.

## Notes

- Skills: `superpowers:test-driven-development` before normalisers; `ecc:error-handling` for empty/non-200 paths; `superpowers:requesting-code-review`, `superpowers:verification-before-completion`.
- The 2.3 MB sections file is fine to commit; keep JSON compact (no pretty-print) for generated artefacts.
- Credits for non-PO courses come from the section's credit value; if Hyperschedule reports a range or zero, use `{min, max}` honestly and never fabricate 1.

## Review History

| Round | Verdict | Summary |
|---|---|---|
| 1 | CHANGES_REQUIRED | H-5 sections-SP2027.json absent so upcomingTerms has one entry; M-5 placeholders via the merge; L-7 geCodes allowlist comment wrong. |
