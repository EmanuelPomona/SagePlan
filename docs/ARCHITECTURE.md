# System Architecture — Pomona GradGuide

## Architecture Status

**Approved.** Approach A from `PROJECT_BRIEF.md`: a minimal general requirement
engine with requirements expressed as data. Decomposed by the manager on
2026-09-08. Cross-cutting decisions are recorded as ADRs in `docs/DECISIONS.md`.

---

## System Overview

A static single-page app plus a scheduled build job. **There is no runtime
server, no database, and no authentication.**

```
SOURCES                     BUILD (GitHub Actions, nightly)        ARTEFACTS (git, /data)        CLIENT
──────────────────────      ────────────────────────────────────   ──────────────────────────    ──────────────────
Coursedog catalog API  ─┐                                          manifest.json             ─┐
Hyperschedule v4 API   ─┼─▶ fetch → normalise → validate ────────▶ catalog.json               │
Registrar GE CSV       ─┤   → cross-source diff → reports          sections-{TERM}.json       ├─▶ static SPA (Vite)
(committed snapshot)    │   → stamp provenance → commit / PR       offering-history.json      │        │
Hand-written program   ─┘                                          programs/*.json            │        ▼
  JSON (in git)                                                    external-credit-rules.json─┘   localStorage
                                                                   reports/*.md (humans only)     (student plan only,
                                                                                                    never transmitted)
```

The browser fetches only its own origin's `/data/*.json`. Student data lives in
`localStorage`, travels only inside an exported file or a share-link URL
**fragment**, and never appears in a request.

---

## The three non-negotiable rules (from the brief, §3)

1. **General education is not special.** GE is `Program #1`: the same `Program`
   and `Requirement` types, the same engine, the same directory. There is no
   `checkGeneralEducation()` anywhere. A code path GE needs that a major would not
   use is a design defect.
2. **Requirements are data, never code.** GE lives in
   `data/programs/general-education-2026.json`. Adding a major later means
   adding one JSON file and changing nothing else. A requirement expressed as an
   `if` statement in TypeScript is a bug.
3. **The `Rule` union is defined in full now; only the P0 variants are
   evaluated.** Deferred variants return `unverifiable` with a clear note. They
   never crash.

Acceptance criterion 11 (`docs/ACCEPTANCE.md`) proves rule 2 with a fake-major
fixture.

---

## Repository layout

npm workspaces monorepo. Node 26 / npm 11 (the machine this was planned on);
CI pins Node 22 LTS or later.

```
package.json                  workspaces root: scripts, shared devDependencies (typescript, vitest, tsx)
tsconfig.base.json            strict; shared compiler options
packages/shared/              CONTRACT. zod schemas + inferred TS types + codecs. Depends only on zod.
                              Owner: manager. Workers request changes via protocol §6.
packages/engine/              Requirement evaluator. Pure functions, zero I/O, no DOM. Depends only on shared.
                              Owner: frontend.
packages/pipeline/            Ingestion scripts run by CI. Depends on shared. Emits into /data.
                              Owner: backend.
apps/web/                     React + TypeScript + Vite single-page app. Depends on shared + engine.
                              Owner: frontend.
data/manifest.json            generated: what artefacts exist, their fetchedAt, catalogYear, terms, programs
data/catalog.json             generated: stable, rebuilt per catalog year (2,811 courses)
data/sections-{TERM}.json     generated: live, rebuilt nightly, one file per term (e.g. sections-FA2026.json)
data/offering-history.json    generated: rebuilt nightly
data/programs/*.json          HAND-WRITTEN, reviewed, committed. GE lives here. Owner: manager.
data/external-credit-rules.json HAND-WRITTEN. AP/IB/A-Level thresholds → credits + granted attributes. Owner: manager.
data/reports/                 generated: validator output for humans (anomalies, cross-source divergences)
data/sources/                 committed inputs: Registrar GE CSV (UTF-16), catalog policy page snapshots
docs/                         contracts, tasks, handoffs, status, review evidence
scripts/                      template tooling (bootstrap, integrate, contract-test, …)
.github/workflows/ci.yml      protocol invariants + build/test on push
.github/workflows/pipeline.yml nightly ingestion (backend writes it)
```

The template's empty `frontend/`, `backend/` and `tests/` placeholders are
removed. Tests live beside the code they test in each package.

### Dependency rules (enforced by review, and by `tsconfig` `references`)

```
shared   ← engine ← web
shared   ← pipeline
```

- `shared` imports nothing from this repo. Its only runtime dependency is `zod`.
- `engine` imports only `shared`. It must run in a Node test with no DOM.
- `pipeline` imports only `shared`. It never imports `engine` or `web`.
- `web` imports `shared` and `engine`. It never imports `pipeline`.

---

## Frontend (`apps/web`) — owner: frontend

| | |
|---|---|
| Framework | React 19 + TypeScript 5.x (strict) |
| Build | Vite 7 |
| Routing | **None.** One page, no tabs, no router (owner decision, `docs/PRODUCT.md` "Interface Shape") |
| Styling | Frontend's choice (CSS modules or plain CSS with custom properties recommended). Must implement light and dark from `docs/DESIGN_BRIEF.md`. No Tailwind unless frontend records why in the design brief. |
| Fonts | Self-hosted via `@fontsource/source-serif-4`, `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`. No runtime font requests. |
| State | React state plus one small store for the `StudentPlan` (Zustand or a `useReducer` + context; frontend's choice). The plan is the only client state that persists. |
| Persistence | `localStorage` key `gradguide:plan:v1` holding a `StudentPlan` (see `docs/DATABASE.md`) |
| Data loading | `fetch()` of same-origin `/data/manifest.json`, then `/data/catalog.json`, `/data/programs/*.json`, `/data/external-credit-rules.json`, and lazily `/data/sections-{TERM}.json` and `/data/offering-history.json` when "What satisfies this?" first opens |
| Serving `/data` | In dev, a small Vite plugin serves the repo's `/data` directory at `/data/*` (excluding `sources/` and `reports/`). At build, the same set is copied into `dist/data/`. Frontend implements; the contract is the paths in `docs/API.md`. |
| Engine use | Calls `evaluate(plan, programs, catalog)` from `@gradguide/engine` on every plan change. Synchronous; the search is microseconds at this scale. |
| Privacy enforcement | `index.html` ships a Content-Security-Policy meta with `connect-src 'self'`, `img-src 'self' data:`, `font-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'`. Any accidental external request fails loudly in the console. |
| Testing | Vitest for hooks, parsers (paste import, share-link codec), selectors; Playwright optional. Browser evidence per protocol §22. |

Primary responsibilities: the single page described in `docs/DESIGN_BRIEF.md`;
course entry with autocomplete and paste; profile and external-credit entry;
the audit with four states plus manual states; requirement detail; "What
satisfies this?" with term filtering, dual-purpose marking, term ribbon;
export, import, share link; staleness banner, catalog-year stamp, disclaimer,
attribution; all interface states in protocol §8 at the three widths in §9.

## Engine (`packages/engine`) — owner: frontend

Pure. Deterministic. No I/O, no `Date.now()`, no randomness, no DOM.

```ts
evaluate(plan: StudentPlan, programs: Program[], catalog: Course[]): Result[]
resolveExternalCredit(input: ExternalCreditInput, rules: ExternalCreditRules): ExternalCredit
```

Semantics are specified in `docs/API.md` §"Engine contract". In brief:

- Implements `course`, `attribute`, `credits`, `gpa`, `attested` in P0. The
  deferred kinds (`allOf`, `anyOf`, `chooseN`, `fromSet`, `milestone`, `not`)
  return `unverifiable` with `note: "rule kind '<kind>' not yet supported"`.
- `unverifiable` is a first-class status, never an error.
- Overrides and attestations win and are flagged (`viaOverride`,
  `viaAttestation`).
- Requirement applicability (`appliesWhen.studentType`) is data; a requirement
  that does not apply returns `satisfied` with `waived: true`.
- **Constrained-first assignment with bounded backtracking.** Requirements with
  the fewest eligible candidates are assigned first; if any requirement ends
  `unmet`, retry with bounded backtracking. No solver dependency.
- Overlap is enforced per `OverlapPolicy` during assignment.
- External credits: thresholds resolved by `resolveExternalCredit`; caps
  (2 advanced-standing credits, 16 transfer courses) and duplicate exams
  (`subjectKey`) enforced inside `credits` evaluation; granted attributes count
  toward `attribute` rules; transfer breadth gated on `studentType`.
- Golden-file tests: the fixture set in `docs/ACCEPTANCE.md` §"Engine fixtures"
  asserts the complete `Result[]` for each fixture against a committed JSON.

## Pipeline (`packages/pipeline`) — owner: backend

**This is what "backend" means on this project.** TypeScript scripts, run by
`tsx`, executed by GitHub Actions nightly and by hand. Deliverables are files in
`/data`, not endpoints. If anyone proposes Express, FastAPI, a database, or an
auth layer, that is scope drift: reject it and cite this section.

| Command | Does |
|---|---|
| `npm run pipeline:catalog` | Coursedog courses → `data/catalog.json`. Sends `Origin: https://catalog.pomona.edu`. Fails on 401 or zero courses. `--from-csv <file>` substitutes the catalog UI's CSV export. |
| `npm run pipeline:sections -- FA2026 SP2027` | Hyperschedule `/v4/sections/{term}` → `data/sections-{TERM}.json` |
| `npm run pipeline:history -- FA2026` | Hyperschedule `/v4/offering-history/{term}` → `data/offering-history.json` |
| `npm run pipeline:validate` | Runs every validator in `docs/API.md` §"Validators"; writes `data/reports/*`; non-zero exit on any hard failure |
| `npm run pipeline:manifest` | Writes `data/manifest.json` from what is on disk |
| `npm run pipeline:all` | The nightly sequence, in order, stopping at the first failure |

Behavior on failure: **stop and keep yesterday's data.** The workflow never
commits a partial or empty artefact. On a diff it opens a pull request with the
validator reports attached; it never pushes to `main` directly.

External API obligations (brief §7): never called from a browser; Hyperschedule
attributed in the UI; maintainers emailed before public launch.

## Data (`/data`) — contract in `docs/API.md`, persistence in `docs/DATABASE.md`

Every generated artefact carries `meta: { schemaVersion, generator, sourceUrl,
fetchedAt, catalogYear }`. The UI renders "catalog data as of {fetchedAt}" and
shows the staleness banner when `catalogYear` is older than the current one.

---

## Authentication

None, by design. See `docs/PRODUCT.md` "Explicitly Out of Scope".

## Database

None. `docs/DATABASE.md` documents the browser-side persistence model
(`localStorage`, export file, share-link fragment) and its migration policy.

---

## External Services

### Coursedog catalog API (build time only)

- Purpose: stable course catalog. School `pomona`, catalog `eziiW38FfLsoDlBqEZgV`.
- Environment variables: `COURSEDOG_CATALOG_ID`, `COURSEDOG_ORIGIN` (must be
  `https://catalog.pomona.edu`). No secrets.
- Failure behavior: HTTP 401 or zero courses → build fails, yesterday's
  `catalog.json` remains. Manual CSV fallback via `--from-csv`.

### Hyperschedule v4 API (build time only)

- Purpose: per-term sections with Pomona GE codes; per-course offering history.
  Base `https://banana.hyperschedule.io`.
- Environment variables: `HYPERSCHEDULE_BASE_URL`, `PIPELINE_TERMS`.
- Failure behavior: non-200 or empty → build fails, previous artefacts remain.

### Registrar GE export (committed snapshot)

- Purpose: cross-source validation of GE attributes. Never powers the app.
- Location: `data/sources/registrar-ge-export-2026-09-08.csv` (UTF-16 LE,
  tab-delimited, Tableau long format). Path in `REGISTRAR_GE_CSV`.
- Failure behavior: parse failure fails the validator; divergences are reported,
  never silently resolved toward one source.

---

## Model Assignment

Where the risk lives on this project: **the engine.** It fails silently and
subtly, its correctness is the product's entire trust proposition, and the
owner chose to keep it in the frontend worktree. Visual quality also matters
here (the design brief is demanding), but it is secondary to a wrong `satisfied`.

| Agent | Model | Effort | Why this project |
|---|---|---|---|
| manager | opus-class (this session: Fable 5.1) | high | Contracts and the GE encoding are product judgment; a wrong contract costs every worker a round |
| frontend-engineer | opus | high | Owns `packages/engine` (constrained-first assignment, overlap, external-credit caps, golden tests) **and** the single-page UI. The engine is where a silent correctness bug would live |
| backend-engineer | sonnet | high | The pipeline is mechanical and fully specified: fetch, normalise, validate, stamp, with concrete validators and measured expectations. TDD on the parsers and validators covers the correctness risk |
| reviewer | sonnet | high | Functional gate against `docs/ACCEPTANCE.md`; visual findings are advisory. Must run the privacy check (network tab) and the golden tests independently |

If the pipeline turns out to need judgment (Coursedog access changes, the CSV
format shifts), the manager may reassign backend to opus at integration; record
it as an ADR.

---

## Ports and Environment

Only the Vite dev server needs a port. `scripts/bootstrap.sh` writes
`FRONTEND_PORT` per worktree; read it from `.env`, never hardcode 3000.
`BACKEND_PORT` and `VITE_API_BASE_URL` are written by the template's bootstrap
but **unused** on this project (there is no backend server); leave them alone.

Pipeline variables (no secrets anywhere in this project):

```
COURSEDOG_CATALOG_ID=eziiW38FfLsoDlBqEZgV
COURSEDOG_ORIGIN=https://catalog.pomona.edu
HYPERSCHEDULE_BASE_URL=https://banana.hyperschedule.io
PIPELINE_TERMS=FA2026,SP2027
REGISTRAR_GE_CSV=data/sources/registrar-ge-export-2026-09-08.csv
```

## Deployed Preview

Any static host (GitHub Pages, Cloudflare Pages, Netlify). `PREVIEW_URL` in
`.env` when one exists; the reviewer falls back to the local worktree otherwise.

## Demo Data

The app must be useful when empty (the empty state shows the GE structure with
real counts), so there is no seed in the database sense. For the reviewer and
demos:

- `npm run seed` verifies that every artefact in `docs/API.md` exists in `/data`
  and validates against `packages/shared` (it is `scripts/contract-test.sh`'s
  artefact step), so a clean clone is never silently empty.
- Demo plans live at `apps/web/public/demo/*.json` (importable) and the README
  carries a share link for the "on-track student" fixture.

---

## Testing strategy

| Layer | Tool | What |
|---|---|---|
| shared | vitest | Codecs (`CourseId` ↔ string, `TermId` ↔ `FA2026`), schema round-trips, `emit-openapi` is current |
| engine | vitest | Golden-file fixtures (complete `Result[]`), property-style tests for assignment (greedy must fail fixture 6; constrained-first must pass), deferred kinds → `unverifiable` |
| pipeline | vitest | UTF-16 CSV parser, pivot, Coursedog normaliser, attribute code mapping, each validator on fixtures, non-empty and 401 guards |
| web | vitest + browser evidence | Paste parser, share-link codec, plan migration, selectors (dual-purpose, term filtering); screenshots and console per protocol §22 |
| contract | `scripts/contract-test.sh` | Every `/data` artefact validates against `packages/shared`; `docs/openapi.yaml` is current |

TDD is mandatory for everything in the first three rows (protocol §14).
