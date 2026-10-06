---
id: TASK-021
title: Web app shell — single page, data loading and failure states, masthead, theme and type, persistence, useful empty state
status: READY
owner: frontend
branch: agent/frontend
priority: HIGH
round: 0
depends_on: [TASK-020]
blocked_on: ""
---

# TASK-021 — Web app shell (`apps/web`)

## Objective

Create the React + TypeScript + Vite single-page app: one scrolling page with
masthead, record, audit and footer sections (no router, no tabs), loading every
artefact in `docs/API.md` §1 with each failure state, the design system from
`docs/DESIGN_BRIEF.md` (palette light/dark, three self-hosted faces, tokens),
`localStorage` persistence with migration, the CSP, and the **useful empty
state**: before any course is entered the audit shows the whole GE structure
with real candidate counts per requirement.

This task establishes the UI system, so the full mandatory design pipeline in
`.claude/agents/frontend-engineer.md` applies before writing UI code.

## Scope

Create only:

```
apps/web/package.json              name @gradguide/web; deps react ^19, react-dom ^19, @gradguide/shared, @gradguide/engine, @fontsource/source-serif-4, @fontsource/ibm-plex-sans, @fontsource/ibm-plex-mono; devDeps vite ^7, @vitejs/plugin-react, @types/react, @types/react-dom, vitest, @testing-library/react, @testing-library/user-event, jsdom; scripts dev (vite --port $FRONTEND_PORT --strictPort), build (tsc -p tsconfig.json && vite build), preview, test, typecheck
apps/web/tsconfig.json             extends base; lib ["ES2022","DOM","DOM.Iterable"]; jsx react-jsx; types vite/client
apps/web/vite.config.ts            react plugin + serveData plugin; define __FIXTURE_DATA__
apps/web/vite-plugins/serveData.ts DEV: serve /data/manifest.json, catalog.json, sections-*.json, offering-history.json from <repo>/data when <repo>/data/manifest.json exists, else from apps/web/dev-fixtures/ and set __FIXTURE_DATA__=true; ALWAYS serve /data/programs/* and /data/external-credit-rules.json from <repo>/data. BUILD: copy the same set into dist/data; throw if <repo>/data/manifest.json is missing (fixture data never ships).
apps/web/dev-fixtures/manifest.json, catalog.json, sections-SP2027.json, offering-history.json   small, hand-made, consistent with each other and with the engine fixture catalog (copy packages/engine/test/fixtures/catalog.fixture.json into a CatalogArtefact envelope)
apps/web/index.html                lang en; <title>Pomona GradGuide (unofficial)</title>; CSP meta: default-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'none'; form-action 'none'
apps/web/src/main.tsx, App.tsx
apps/web/src/data/loadData.ts      loadManifest(), loadCatalog(), loadPrograms(manifest), loadRules(), loadSections(termCode), loadHistory(): each returns Promise<Loaded<T>> = { ok: true, value } | { ok: false, error: DataError }; DataError = { path: string; kind: "notFound" | "badJson" | "schema" | "network"; detail: string }
apps/web/src/data/DataProvider.tsx useData(): { status: "loading" } | { status: "error"; error: DataError } | { status: "ready"; manifest; catalog; programs; rules; fixture: boolean }
apps/web/src/plan/planStore.ts     usePlan() (API below); localStorage key gradguide:plan:v1; debounced save ≤250ms; status ok|corrupt|quota
apps/web/src/plan/migratePlan.ts   migratePlan(raw: unknown): { ok: true; plan: StudentPlan } | { ok: false; reason: "newer" | "invalid"; detail: string }
apps/web/src/audit/useAudit.ts     useAudit(): Result[] = useMemo(evaluate(plan, [ge, ...declared], catalog.courses))
apps/web/src/layout/Page.tsx       the ONE page: <Masthead/> <RecordSection/> <AuditSection/> <Footer/>; section slots for later tasks
apps/web/src/layout/Masthead.tsx   "Pomona GradGuide" + "unofficial", catalog year, "data as of", staleness banner, disclaimer (exact text below, link to https://my.pomona.edu), FIXTURE DATA banner when __FIXTURE_DATA__
apps/web/src/layout/Footer.tsx     slot for TASK-025 controls; attribution: "Course and section data from Hyperschedule (BSD-3-Clause) and the Pomona College Catalog." with the Hyperschedule copyright notice; succession line from README
apps/web/src/audit/AuditSection.tsx  THIS TASK: empty-state list of requirement groups and rows (glyph ○, label, "n courses could satisfy this" from Result.candidates.length, summary line "0 of 6 breadth areas"); TASK-023 replaces the row internals
apps/web/src/audit/StatusGlyph.tsx   ● ◐ ○ ◌ with aria-label = status word
apps/web/src/record/RecordSection.tsx  THIS TASK: heading + placeholder text "Add your courses to see your audit." + profile summary; TASK-022 fills it
apps/web/src/styles/tokens.css       --canvas, --rule, --ink, --ink-2, --satisfied, --partial, --unmet, --unverifiable, --manual, --focus, type scale, spacing; light on :root, dark under [data-theme=dark] and prefers-color-scheme
apps/web/src/styles/global.css       reset, fonts (@fontsource imports in main.tsx), focus ring, row hairlines
apps/web/src/theme/useTheme.ts       system | light | dark, stored in gradguide:ui:v1
apps/web/src/test/{migratePlan,planStore,loadData}.test.ts
```

## Interfaces

**Consumes:** `evaluate`, `EXAM_PSEUDO_ID` from `@gradguide/engine`; all shared
schemas; `data/programs/*.json`, `data/external-credit-rules.json` (exist).

**Produces** (TASK-022/023/024/025 rely on these exact names):

```ts
// apps/web/src/plan/planStore.ts
usePlan(): {
  plan: StudentPlan; status: "ok" | "corrupt" | "quota";
  setProfile(p: { matriculationTerm: TermId; studentType: StudentType }): void;
  addCompleted(c: CompletedCourse): void; updateCompleted(i: number, patch: Partial<CompletedCourse>): void; removeCompleted(i: number): void;
  addExternalCredit(e: ExternalCredit): void; removeExternalCredit(i: number): void;
  setAttestation(id: string, value: boolean): void;
  addOverride(o: Override): void; removeOverride(i: number): void;
  replacePlan(p: StudentPlan): void; rawStored(): string | null;
}
// apps/web/src/data/DataProvider.tsx
useData(): DataState (above)
// apps/web/src/audit/useAudit.ts
useAudit(): Result[]
// apps/web/src/data/loadData.ts
loadSections(term: TermCode), loadHistory()   (used lazily by TASK-024)
```

Exact disclaimer string (house copy rule: no em dashes in UI strings):
`The Registrar's official audit is the source of truth. Confirm with your advisor before registering.`

## Tests to write first

1. `migratePlan.test.ts`: valid v1 → ok; `schemaVersion: 2` → `newer`; garbage → `invalid`; every `apps/web/public/demo/*.json` (once TASK-025 adds them; for now the engine fixture plans) round-trips.
2. `planStore.test.ts` (jsdom): save → reload restores; corrupt string → `status: corrupt` and `rawStored()` returns it; quota error (mock `setItem` to throw) → `status: quota`.
3. `loadData.test.ts` (mocked `fetch`): 404 → `notFound`; invalid JSON → `badJson`; schema failure → `schema` with the first issue path in `detail`.

## Acceptance Criteria

- [ ] AC-P12: no router; `grep -r "react-router" apps/web` empty; one page.
- [ ] AC-P13: masthead shows catalog year and "data as of"; editing `dev-fixtures/manifest.json` to `catalogYear: "2024-2025"` shows the staleness banner; disclaimer text exact; attribution present.
- [ ] AC-P14: empty state shows every GE requirement with a real candidate count (from the served catalog) and the "0 of 6 breadth areas" line. Screenshot `docs/review/F-NN-state-empty.png`.
- [ ] AC-F01 (this task's share): loading, data-unavailable (rename `manifest.json` in dev-fixtures to reproduce), corrupt-plan, quota states each screenshotted.
- [ ] AC-F07: light and dark both implement the brief's palette; status glyph + word present.
- [ ] AC-F08: console clean, zero CSP violations (`docs/review/F-console.txt`).
- [ ] AC-U05, AC-U07: no Pomona blue; three faces self-hosted; `docs/review/F-network.txt` shows no font or other external request.
- [ ] AC-B08: `grep -ri "hyperschedule.io\|coursedog.com" apps/web/src` finds only the attribution link.
- [ ] Responsive at 1440/768/390 for the shell (`F-01/02/03-*.png`).
- [ ] `npm run typecheck`, `lint`, `test`, `build` pass at root; `npm run build` fails with a clear message when `data/manifest.json` is absent (prove it, then note it under What Was NOT Verified if the real manifest does not exist yet on your branch).

## Notes

- Skills, in order, before UI code: `ecc:frontend-design-direction`, `frontend-design:frontend-design`, `ui-ux-pro-max:ui-ux-pro-max`, `design-taste-frontend`; then `vercel:react-best-practices`, `ecc:react-patterns`, `ecc:vite-patterns`, `ecc:frontend-a11y`; after structure: `ecc:make-interfaces-feel-better`; before handoff: `ecc:browser-qa`, `superpowers:requesting-code-review`, `superpowers:verification-before-completion`.
- Read `docs/DESIGN_BRIEF.md` in full. The signature element (margin of evidence) is laid out here as the row grid even though rows are empty-state; TASK-023 fills them.
- `FRONTEND_PORT` comes from `.env` via `scripts/bootstrap.sh`; never hardcode 3000.
- The fixture-data fallback exists so you can work before the pipeline lands. Its banner must be impossible to miss and must never appear in a production build.
- Run `scripts/slop-check.sh` before handoff.

## Review History

| Round | Verdict | Summary |
|---|---|---|
| 1 | APPROVED | Approved. Advisory only: M-6 audit 1774px vs the brief's one-viewport claim; M-8 checkboxes render 13x32 dark blocks. Moved to DEBT.md. |
