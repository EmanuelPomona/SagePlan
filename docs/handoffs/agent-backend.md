# Handoffs — agent/backend

## CONTRACT CHANGE REQUEST — TASK-010 — 2026-09-08

Raised before implementation, per `docs/AGENT_PROTOCOL.md` §6 and TASK-010's own
instruction ("do not widen it: file a CONTRACT CHANGE REQUEST with a real example
record"). Everything below is measured from a live authenticated fetch of the
2,811-record Coursedog payload, not inferred.

**Reproduce:**
```
curl -sS -H 'Origin: https://catalog.pomona.edu' \
 'https://app.coursedog.com/api/v1/cm/pomona/courses/search/$filters?catalogId=eziiW38FfLsoDlBqEZgV&skip=0&limit=3000&orderBy=catalogDisplayName&formatDependents=false&ignoreEffectiveDating=true'
-> http=200, listLength=2811
```

---

### Item 1 — AC-B01's "≥ 2,700 courses" cannot be met without shipping junk records

**Current contract.** TASK-010 AC-B01: "`npm run pipeline:catalog` writes
`data/catalog.json` with ≥ 2,700 courses". The figure comes from brief §7A's
measured 2,811, which counted the raw payload.

**What the data actually contains.** The payload is not 2,811 courses. It carries
a `status` field the brief did not model:

| status | count |
|---|---|
| Active | 2,235 |
| Banked | 458 |
| Inactive | 118 |
| **total** | **2,811** |

The non-Active records are administrative placeholders and test rows, not
courses. Real examples, verbatim:

| code | name | status |
|---|---|---|
| `PE WAIVER` | "PE Waiver" | Banked |
| `REG PENDING` | "Registration Pending" | Banked |
| `OVERLAYWI` | "Writing Intensive Overlay" | Banked |
| `FOR LANG REQ` | "Foreign Language Req Fulfilled" | Banked |
| `AWAY` | "F/T Enrollment - Away from PO" | Banked |
| `TEST001 PO` | "Your Course 101" | Inactive |
| `TEST003 PO` | "This is a test (3)" | Inactive |
| `TEST099 PO` | "BALL testing" | Banked |

29 of these have no `subjectCode` at all and cannot produce a `CourseId`.

**Every candidate filter, measured against the threshold:**

| filter | courses | ≥2,700? | junk kept |
|---|---|---|---|
| no filter (`all`) | 2,811 | yes | 6+ |
| `status = Active` | 2,235 | **no** | 0 |
| `catalogPrint = true` | 2,177 | no | 6+ |
| `Active` + `catalogPrint` | 2,031 | no | 0 |
| `status != Inactive` | 2,693 | **no** | 5 |

After also removing the 142 duplicate records in Item 2, an honest Pomona catalog
is **≈ 2,093 courses**.

**No filter that excludes the junk reaches 2,700.** The threshold is satisfiable
only by shipping `PE WAIVER` and `Your Course 101` into the catalog the frontend
feeds to course autocomplete (TASK-022).

**Proposed change.** Replace AC-B01's count assertion with:

- ingest `status === "Active"` only, and record the excluded counts by status in
  the log and in `data/reports/`;
- assert **≥ 2,000 PO courses** as the non-empty sanity floor (still catching a
  truncated or broken fetch, which is what the guard is for);
- keep the zero-course and HTTP 401/403 hard-fail guards exactly as written.

**Reason.** The engine's correctness is the product's whole trust proposition
(ARCHITECTURE.md §Model Assignment). A catalog containing "Registration Pending"
produces nonsense autocomplete entries and a nonsense denominator.

**Consequence if unchanged.** I cannot mark AC-B01 met. Either the catalog ships
known-junk records, or the acceptance criterion fails on a correct
implementation. I will not resolve that silently in either direction.

---

### Item 2 — 139 duplicate course records; the obvious tie-break loses GE attributes on 55 courses

**Current contract.** Not addressed. `CatalogArtefact.courses` is a flat array;
nothing says a `courseKey` is unique, and nothing says which record wins.

**What the data contains.** Among Active records, 139 `subjectCode + courseNumber`
groups hold more than one record (142 extra records). They are catalog editions,
distinguished only by a year suffix on `_id`. Real example, both Active:

```json
{ "_id": "POLI161 PO -2023", "code": "POLI161 PO", "name": "Comparative Social Policy",
  "attributes": ["PO Area 2 Requirement ;PO Writing Intensive Req;Asian Studies ;International Relations ;Politics"] }

{ "_id": "POLI161 PO -2024", "code": "POLI161 PO", "name": "Comparative Social Policy",
  "attributes": [] }
```

Measured across all 139 groups:

- 83 groups agree on GE attributes — any pick is safe.
- **56 groups disagree.**
- In **55 of those 56**, choosing the highest `_id` year (the intuitive
  "newest wins") **discards the GE attributes** and keeps the empty record.

`_id` suffixes among Active records: 2023 -> 1,834, 2024 -> 115, none -> 286. The
2024 edition is partial, not newer-and-better.

**Proposed change.** Add to `docs/API.md` §CatalogArtefact: *"`courseKey(course.id)`
is unique within `courses`. Where the upstream catalog carries several editions of
one course, the pipeline keeps the most complete record: most GE attributes first,
then non-empty description, then highest `_id` edition. The discarded records are
listed in `data/reports/catalog-duplicates.md`."*

**Reason.** There is no defensible mechanical "latest wins" rule here — latest is
emptier. Silently picking wrong marks 55 courses as carrying no GE attribute,
which makes the engine answer `unmet` for requirements a student has actually
satisfied. That is the silent-correctness failure this project is organised to
prevent, and it is a cross-agent decision because frontend consumes the result.

**Consequence if unchanged.** Any implementation picks *some* winner. Without a
stated rule the choice is invisible, untested, and wrong for 55 courses.

**Interim behaviour (so work continues, per §6 step 1).** I will implement the
proposed most-complete rule, emit `data/reports/catalog-duplicates.md`, and cover
it with a test. If the manager rules differently, only `dedupe.ts` changes.

---

### Item 4 — `PIPELINE_MAX_DIVERGENCES` default of 25 makes the nightly red on day one

**Current contract.** `docs/API.md` §4 validator 3: "warn (fail if divergence
count exceeds `PIPELINE_MAX_DIVERGENCES`, default 25)"; `.env.example` sets 25.

**Measured.** The real Coursedog-vs-Registrar divergence count is **257** across
2,005 Pomona courses (≈12%). Direction: the Registrar carries strictly more
attributes on 184 courses, Coursedog on 73. `data/reports/ge-divergences.md`
lists every one with both sides shown.

**Consequence as written.** Validator 3 fails on every run, so `pipeline:all`
stops at `validate`, the manifest is never written, and `scripts/contract-test.sh`
can never reach 0 — which is TASK-013's AC-B06. The threshold as specified does
not distinguish "the two sources disagree, as they always have" from "something
broke last night".

**Proposed change.** Raise the default to **300** in `docs/API.md` §4 and
`.env.example`, so the guard catches a genuine regression (a jump above the
known baseline) rather than firing on the steady state. Alternatively make
validator 3 warn-only and track the count as a trend.

**Interim behaviour.** I did NOT edit `docs/API.md` or `.env.example` — the
manager owns both. The code default stays 25, matching the documented contract.
`.github/workflows/pipeline.yml` sets `PIPELINE_MAX_DIVERGENCES: "300"`
explicitly with a comment, and every verification run in this handoff that needed
it passes it on the command line, so the number is always visible rather than
hidden in a default.

---

### Item 3 — two smaller shape facts (no contract change needed; recorded so the reviewer can check them)

1. **`credits` has two upstream shapes, not one.** Brief §7A says
   `{repeatable, numberOfRepeats, creditHours:{min,max}}`, "100% populated". 182
   Active records instead carry `{repeatable, creditHours:{value, operator}, billingHours:{…}}`
   — no `min`/`max`, no `numberOfRepeats`. Example: `MUS092 PO`
   ("Linguistic Elements of Music"), `creditHours: {"value":1,"operator":""}`.
   Handled in the normaliser as `min = max = value`; `CourseSchema.credits` already
   fits, so this is mine to absorb, not a contract change. None of the 182 carries
   a GE attribute.
2. **`attributes[]` entries are semicolon-delimited composites**, not single tags:
   `"PO Area 2 Requirement ;All Government/Politics ;Politics"`. `COURSEDOG_ATTRIBUTE_MAP`
   is therefore keyed on the **split-and-trimmed token**, which is what TASK-010's
   `Record<string, GeAttribute>` signature supports unchanged. 106 distinct tokens;
   the complete Pomona GE vocabulary is the 12 `PO …` tokens below, plus
   `PO DDP Courses` (76) which is dropped exactly as Hyperschedule's `1DDP` is.

   | Coursedog token | GeAttribute | n |
   |---|---|---|
   | `PO Area 1 Requirement` | AREA_1 | 454 |
   | `PO Area 2 Requirement` | AREA_2 | 364 |
   | `PO Area 3 Requirement` | AREA_3 | 301 |
   | `PO Area 4 Requirement` | AREA_4 | 179 |
   | `PO Area 5 Requirement` | AREA_5 | 100 |
   | `PO Area 6 Requirement` | AREA_6 | 223 |
   | `PO Writing Intensive Req` | WRITING_INTENSIVE | 173 |
   | `PO Speaking Intensive` | SPEAKING_INTENSIVE | 198 |
   | `PO Analyzing Difference` | ANALYZING_DIFFERENCE | 125 |
   | `PO Language Requirement` | LANGUAGE | 130 |
   | `PO Phys Ed Requirement` | PHYSICAL_EDUCATION | 181 |
   | `PO Community Partnership` | COMMUNITY_PARTNERSHIP | 27 |

   **Guard caveat the manager should know:** TASK-010 says fail on any unmapped
   token containing "Area", "Intensive", "Analyzing", "Language" or "Physical".
   Two *non-GE* tokens trip that: `All Languages` (209, a subject grouping) and
   `Physical Education` (155, a department grouping — the real GE token is
   `PO Phys Ed Requirement`, which contains neither "Physical" nor "Area"). I am
   implementing the guard with an explicit, commented known-non-GE allowlist for
   those two, so a genuinely new token such as "PO Area 9 Requirement" still fails
   the build. Flagging it because it slightly changes the guard's shape.

3. **One Active record has an empty `name`**: `ENGL195B PO`. `CourseSchema.title`
   is `z.string().min(1)`, so it cannot be represented. I will drop it and count it
   as a normalise issue in the log rather than invent a title. Say if you want a
   placeholder instead.

---

### Status

TASK-010 set to `BLOCKED`, `blocked_on: contract`, on Item 1 (the acceptance
threshold, which I cannot honestly meet) and Item 2 (a correctness policy that is
the manager's to own). TASK-011/012/013 are not independently blocked; they depend
on TASK-010.

Per §6 step 5 I am continuing with the unaffected work: `env`, `http`, `write`,
`meta`, `raw`, `attributeMap`, `normalise`, `csvFallback`, `cli` and their tests.
None of that changes under either resolution.

---

## HANDOFF-1 — agent/backend — 2026-09-08

### Summary
`packages/pipeline` is complete and runs end to end against live upstreams.
`npm run pipeline:all` exits 0, `scripts/contract-test.sh` exits 0, and `/data`
now holds a 2,989-course catalog spanning 12 campuses, 2,159 FA2026 sections,
1,416 offering histories, a manifest, and eight validator reports.

"Backend" on this project is this pipeline — no server, no database, no auth
(`docs/ARCHITECTURE.md` §Pipeline). None was proposed.

Four items still need the manager: the CONTRACT CHANGE REQUEST above. Two of
them (the AC-B01 count and the duplicate-edition rule) changed what ships and
are implemented against my proposals on the owner's instruction to proceed.

### Tasks Completed
- **TASK-010** — AC-B01 (catalog written, count criterion superseded by CCR item 1;
  `--from-csv` set identical to the API run), AC-P08 (401 → exit 1, `/data` clean),
  validate-artefacts passes, typecheck/lint/test pass, scope respected.
- **TASK-011** — AC-B02 (pivot asserts the export's 5,768 courses and all eleven
  measured attribute counts), AC-B03 (`exclusion-anomalies.md` written),
  AC-P09 (`ge-divergences.md`, count 257, threshold behaviour per spec),
  `pipeline:validate` exits non-zero on a hard failure.
- **TASK-012** — AC-B04 (2,159 FA2026 sections), AC-B05 (1,416 courses, ascending
  `knownTerms`), catalog grew 2,087 → 2,989 with every PO entry byte-identical,
  `hyperschedule-attribute-diff.md` written.
- **TASK-013** — AC-B06/AC-I01 (`contract-test.sh` exits 0 after `pipeline:all`),
  AC-P08 re-verified, AC-B03 (`validation.json` carries eight checks by id),
  AC-B07 (workflow reviewed against a checklist — see What Was NOT Verified),
  `npm run seed` exits 0.

### Files Changed
- `packages/pipeline/**` — 26 source modules, 19 test files, 6 fixtures
- `data/catalog.json`, `data/sections-FA2026.json`, `data/offering-history.json`,
  `data/manifest.json`, `data/reports/*` (generated)
- `.github/workflows/pipeline.yml` (new; its change detector compares artefacts
  with `generatedAt`/`fetchedAt`/`lastVerified` stripped, so the nightly opens a PR
  only when the data moved rather than every night on the clock)
- `docs/status/agent-backend.md`, `docs/handoffs/agent-backend.md`,
  `docs/tasks/TASK-010..013` (frontmatter → REVIEW)
- Not touched: `packages/shared`, `docs/API.md`, `docs/openapi.yaml`,
  `docs/DATABASE.md`, `.env.example`, `data/programs/`, `data/sources/`,
  `docs/tasks/INDEX.md` (shared + generated)

### Contracts
Consumed unchanged from `@gradguide/shared`. **Produced for the frontend:**

| Artefact | Shape | Live size |
|---|---|---|
| `/data/manifest.json` | `Manifest` | 1 sections entry, `upcomingTerms: ["FA2026"]` |
| `/data/catalog.json` | `CatalogArtefact` | 2,989 courses, 12 affiliations, `courseKey` unique |
| `/data/sections-FA2026.json` | `SectionsArtefact` | 2,159 sections |
| `/data/offering-history.json` | `OfferingHistoryArtefact` | 1,416 courses, 32 `knownTerms` |

Three things frontend should know:
1. **`upcomingTerms` currently contains only `FA2026`.** SP2027 is not published
   by Hyperschedule yet (HTTP 404); the manifest omits it by design. Do not
   hard-code two terms.
2. **`Section.half` is `"F1"`/`"F2"`, not `"F"`/`"S"`.** Upstream models it as
   `{prefix, number}`; I preserved the number rather than discard it. It fits
   `z.string().nullable()`. If you test `half === "F"` it will not match.
3. **Non-PO courses have `description: ""` and `gradeMode: ""`** — Hyperschedule
   is a schedule, not a catalog. Render an empty description as absent, not blank.

### Skills Used
| Skill | Stage invoked | What it actually changed |
|---|---|---|
| `ecc:backend-patterns` | before structuring the package | Fixed the I/O / pure / orchestration split; gave `PipelineError` its status field, `http.ts` its backoff, and the one-line-per-phase logs |
| `ecc:contract-first` | before writing against `packages/shared` | Sent four contract questions to the manager instead of deciding them in the normaliser; kept raw upstream shapes out of `Course` |
| `superpowers:test-driven-development` | before every parser, normaliser, validator, command | Every module written test-first and watched fail. Caught the prereq regex matching a Coursedog internal id as a course code, and a CSV fixture generator bug |
| `ecc:error-handling` | before `http.ts` / `write.ts` | "Retry only retriable errors" → 401/403 fail on the first attempt; validate-then-temp-then-rename → no partial artefact |
| `superpowers:requesting-code-review` | after implementation, before this handoff | Adversarial reviewer over `ef81a0f..e3a87d8` |
| `superpowers:verification-before-completion` | immediately before this handoff | Forced the full re-run recorded under Verification |

Deliberately not invoked, per protocol §1: `ecc:api-design` (no REST surface —
this project ships files) and `ecc:security-review` (no user input, no secrets,
no auth; the workflow uses only `GITHUB_TOKEN` via `permissions:`). TASK-010's
own skill list omits both for the same reasons. `scripts/audit-skills.sh`
corroborates every claim above.

### Verification
```
npm run typecheck                     -> rc=0
npm run lint                          -> rc=0
npm test                              -> rc=0   233 tests (220 pipeline + 13 shared)
npm run seed                          -> rc=0

npm run pipeline:catalog
  [catalog] source=coursedog records=2811 origin=https://catalog.pomona.edu
  [catalog.normalise] in=2811 out=2233 not-active=576 unparseable-id=1 empty-title=1
  [catalog.dedupe] in=2233 out=2087 discarded=146
  [catalog.write] courses=2989 po=2087 preserved=902 unmapped=0

AC-P08  COURSEDOG_ORIGIN=https://wrong.example npm run pipeline:catalog
  FAIL [HTTP_ERROR status=401] ... -> HTTP 401: {"error":"Unauthenticated"}
  exit=1 ; git status --porcelain data/ -> (empty)

AC-B01  --from-csv vs API run
  api courses: 2087   csv courses: 2087
  only in API run: 0 []      only in CSV run: 0 []
  IDENTICAL course sets

npm run pipeline:sections -- FA2026 SP2027
  [sections] term=FA2026 fetched=2159 written=2159 skippedSummer=0 unknownPomonaCodes=0
  [sections] term=SP2027 status=not-published-yet httpStatus=404 action=skipped
  [sections.merge] before=2989 after=2989 added=0 AF=29 PZ=187 PO=2005 JT=22 SC=184
                   HM=153 CM=214 AA=7 KS=79 CH=40 JM=3 JP=66

TASK-012 PO byte-identity across the merge
  PO entries before merge: 2005 | after: 2005
  byte-identical: YES

npm run pipeline:history -- FA2026
  [history] term=FA2026 courses=1416 knownTerms=32 skippedNonFaSp=0

PIPELINE_MAX_DIVERGENCES=300 npm run pipeline:all      -> exit 0
  catalog ok / sections ok / history ok / validate ok / manifest ok / verify ok

data/reports/validation.json  -> ok: true | checks: 8
  warn  ge-agreement               count=257
  warn  exclusion-anomalies        count=10
  warn  hyperschedule-attributes   count=83
  pass  artefact-schemas           count=0
  pass  non-empty                  count=0
  pass  provenance                 count=0
  warn  source-quotes              count=3   (34 quotes, 0 not found in snapshot)
  pass  manifest                   count=0

scripts/contract-test.sh -> exit 0
  OK data/manifest.json / catalog.json / sections-FA2026.json / offering-history.json
  6 check(s), 0 failed
  CONTRACT OK

scripts/audit-skills.sh -> invocations at 24%,25%,33%,34%,96% through the session;
  all claims corroborated

Idempotency (found and fixed while verifying):
  pipeline:all run twice with no upstream change -> all 5 artefacts rewritten,
  because each carries a fresh generatedAt/fetchedAt/lastVerified. The workflow's
  change detector now strips those three fields before comparing.
  with only timestamps differing  -> manifest, offering-history, validation.json
                                     correctly reported NOT substantive
  after mutating one course title -> data/catalog.json correctly flagged
  data/sections-FA2026.json flagged between runs -> real: one section's
                                     seatsFilled and status moved; ordering identical
```
Artefacts for the reviewer: `data/reports/validation.json`,
`ge-divergences.md`, `exclusion-anomalies.md`, `hyperschedule-attribute-diff.md`,
`catalog-duplicates.md`, `source-quotes.md`.

### What Was NOT Verified
- **The workflow has never executed.** There is no git remote on this worktree, so
  no `workflow_dispatch` run, no PR URL, and `act` is not installed. `actionlint`
  is not installed either. I verified only that the YAML parses and that its
  structure is right (cron `0 6 * * *`, `workflow_dispatch`, Node 22, concurrency
  group `data-pipeline`, `permissions: contents/pull-requests: write`, PR `base: main`,
  `add-paths: data`). **AC-B07 is therefore unverified** — treat the workflow as
  reviewed-but-untested until someone dispatches it.
- **The `--from-csv` column names are unverified against a real export.** Coursedog's
  catalog UI "Export all results as CSV" was not reachable from this environment,
  so I generated the CSV from the captured API payload. The parser matches headers
  case-insensitively with aliases, but if the real export names columns differently
  it will need one line changed in `COLUMNS`.
- **Validator 7 cannot verify three pages against the live site.** The
  `degree-requirements-tab-*` pages render their text client-side, so the served
  HTML has none of their 29 quotes. The check says so explicitly rather than
  claiming the quotes vanished. The committed-snapshot gate still covers them
  (34 quotes, 0 failures) and works offline.
- **The 257 GE divergences are reported, not adjudicated.** I did not decide which
  source is right for any of them; that is the owner's call via the report.
- **SP2027 has never been fetched successfully** (404 upstream). The multi-term path
  is covered by tests with injected fetches, not by a live two-term run.
- **The pipeline does not read `.env`.** It reads `process.env` with the committed
  defaults from `.env.example` baked into `src/env.ts`. Nothing here is secret, and
  the workflow sets its variables explicitly, but a value placed in `.env` alone
  will NOT take effect.
- I did not run the frontend, the engine, or any browser check — none exists yet,
  and none is mine.

### Known Issues
- `PIPELINE_MAX_DIVERGENCES=25` (the documented default) fails validator 3 on every
  run because the true baseline is 257. CCR item 4. Until ratified, `pipeline:all`
  needs the variable set — the workflow sets it to 300 explicitly.
- One Active Coursedog record is dropped as `unparseable-id` and one as
  `empty-title` (`ENGL195B PO`, whose `name` is empty upstream). Both are counted
  in the log, never silent.
- `MUS031-042PO` in the Registrar export is a course RANGE, not a course; it is
  reported in `unparseable` and excluded from the pivot.
- The brief's "PO 1,785" is 1,774 PO + 10 rows whose affiliation is spelled
  `LPO`/`PPO` + that range. Not a defect, but the figures differ by design.

### Commit
Branch `agent/backend`, no remote configured (so "push" is a commit here):
- `d162e78` CONTRACT CHANGE REQUEST, TASK-010 blocked on contract
- `ef81a0f` TASK-010 + TASK-011
- `e3a87d8` TASK-012 + TASK-013
- `fd5cc06` handoff, status, task frontmatter
- `1acb4e6` nightly PR only on substantive change

---

## HANDOFF-2 — agent/backend — 2026-09-08 (code review applied)

### Summary
An adversarial code-review subagent was run over `ef81a0f..e3a87d8` plus the whole
package. It returned 3 Critical, 11 Important and 11 Minor findings. **All three
Critical were real**, and all three were the silent kind this project is organised
to prevent. Every Critical and Important finding is fixed; one finding I pushed
back on with evidence. Details in commit `b14d3cb`.

### What the review caught that my own testing did not
1. `readExistingCourses` returned `[]` for a catalog that **exists but is
   unreadable** — indistinguishable from "no catalog". A `schemaVersion` bump was
   enough to make `pipeline:catalog` write a PO-only file **with exit 0**, deleting
   all 984 non-Pomona courses. My tests only ever exercised the valid and absent
   cases.
2. `GE_GUARD_RE` did not match `"PO Phys Ed Requirement"` ("Phys" is not
   "Physical") or `"PO Community Partnership"` — two of the twelve tokens it
   exists to guard. My own test only asserted the guard against `"PO Area 9
   Requirement"`, which is why the hole was invisible. A rename upstream would
   have dropped 181 + 27 courses' GE tags on a green build.
3. Hyperschedule's `unknownPomona` codes reached a log field that no gate reads,
   so the two ingest paths disagreed about the "never silently drop a GE
   attribute" rule.
4. `checkGeAgreement` iterated only the catalog, so **25 Pomona courses the
   Registrar tags but the catalog lacks** were never reported — including
   `CSCI 051G PO`. Now bidirectional; the count moved 257 → 282, matching the
   review's independent figure exactly.

### Finding I pushed back on (17)
The claim was that `courseNumber` never carries an affiliation, so the
affiliation strip should not run on that fallback path. **In this catalog it
does** (`"033 PO"`, `"199DRPO"`), and `code` genuinely disagrees with
`subjectCode` — `{code: "LATN033 PO", subjectCode: "CLAS"}` and
`{code: "DS 190 PO", subjectCode: "ID"}` are real records. I applied the change,
measured it, and it produced `CLAS 033PO PO` for 10 real courses, so I reverted
it and added those records as tests instead. The catalog is byte-identical
across the revert: **0 courses added, 0 removed**.

### Fresh verification (run immediately before this handoff, nothing after it)
```
npm run typecheck        -> rc=0
npm run lint             -> rc=0
npm run build            -> rc=0
npm test                 -> rc=0   274 pipeline + 13 shared = 287 tests
npm run seed             -> rc=0
scripts/contract-test.sh -> rc=0   CONTRACT OK

PIPELINE_MAX_DIVERGENCES=300 npm run pipeline:all -> exit 0
  catalog ok / sections ok / history ok / validate ok / manifest ok / verify ok

validation.json -> ok: true, 8 checks
  warn ge-agreement 282 | warn exclusion-anomalies 10 | warn hyperschedule-attributes 78
  pass artefact-schemas 0 | pass non-empty 0 | pass provenance 0
  warn source-quotes 3 | pass manifest 0

AC-P08, re-run from a CLEAN tree so the evidence is unambiguous:
  COURSEDOG_ORIGIN=https://wrong.example npm run pipeline:catalog
  -> exit 1, FAIL [HTTP_ERROR status=401]
  -> git status --porcelain data/  ->  (empty)

RED-GREEN on the Critical-1 regression test:
  fix reverted  -> "THROWS rather than returning empty..." FAILS (1 failed | 7 passed)
  fix restored  -> 8 passed; git diff on the source is empty

scripts/audit-skills.sh -> 6 invocations at 19,20,26,26,75,99% through the session;
  every claim corroborated
```

### New known issue found while verifying
**Coursedog ignores an unknown `catalogId`.** Requesting
`catalogId=nonexistent-catalog-id` returns **HTTP 200 with 2,675 records**, not an
error. So a typo in `COURSEDOG_CATALOG_ID` yields a plausible-but-wrong catalog
and exits 0; the only thing standing in the way is the ≥2,000 floor, which such a
response clears. The workflow pins the id explicitly, but nothing detects a wrong
one. Worth a manager decision: pin an expected course-count range, or assert a
known-good sentinel course is present.

### What Was NOT Verified (unchanged from HANDOFF-1, plus)
- The zero-course guard was **not** exercisable against the live API for the
  reason above; it is covered only by unit tests with an injected fetch
  (`CATALOG_EMPTY`, `CATALOG_TOO_SMALL`).
- The workflow still has never executed — no remote, no `actionlint`, no `act`.
  **AC-B07 remains unverified.**
- The review's remaining Minor findings 16, 22, 23, 24, 25 are acknowledged and
  not fixed: a discard-reason wording nit, `fsync` before rename, an unbounded
  pagination loop, `credits ?? 0` on a section with no credit value, and three
  bare `catch {}` blocks. None changes a shipped number; all are recorded here
  rather than silently dropped.

### Commit
`b14d3cb` (review fixes), on `1acb4e6`, `a44ed99`, `fd5cc06`, `e3a87d8`,
`ef81a0f`, `d162e78`. Branch `agent/backend`, no remote.

---

## CONTRACT CHANGE REQUEST — H-6 — double-credit PE courses — 2026-09-11

The manager asked: "tell me what the spec should say and I will change it."
Three separate things are wrong; only the third needs a contract change.

### 1. `docs/tasks/TASK-011.md` "Upstream facts" is factually wrong — fix the prose

**Says:** "`Measure Values` is `0`/`1`", and the test list says `Measure Values "0"
rows add nothing`.

**Measured in the committed export:** `{"0": 27857, "1": 969, "2": 19}`. All
nineteen 2s are `Physical Education`, on full-credit dance and PE courses —
`DANC012 PPO`, `DANC050/051`, `DANC120/122/124`, `DANC150C PO`, `DANC175/176 PO`,
`THEA053HG PO`, `MSL 099 CM`, `PE 077E/080 PO`.

**Should say:** "`Measure Values` is `0`, `1` or `2`. `0` means the measure does
not apply. `1` means it does. `2` appears only on `Physical Education` and marks a
course the Registrar counts as **two** PE courses. AC-B02's `PE 241` only holds if
`2` counts as present; a literal `=== "1"` reading gives 222."

No code change: `pivot.ts` already tests `>= 1`, which is why AC-B02 passes. It is
now covered by a test and a comment that name the value-2 case explicitly, which
is what was missing.

### 2. The multiplicity is then discarded — and this one produces a wrong answer

`pivotRegistrar` yields `Set<GeAttribute>`, so `DANC 012` becomes "has
PHYSICAL_EDUCATION" exactly like a single-credit PE course. The GE rule is
`{kind:"attribute", attr:"PHYSICAL_EDUCATION", n:2, distinctTerms:true}`, and
`distinctTerms` makes it structurally impossible for one course to close both
halves. **A student who satisfied PE with one double-credit dance course is told
they still owe another.**

### 3. What the contract should say — three options, with a recommendation

`Course` has no way to express a per-course attribute weight. `attribute` rules
carry `unit: "courses" | "credits"` but that describes the RULE, not the course.

| Option | Change | Cost |
|---|---|---|
| **A (recommended)** | Add `attributeWeights?: Partial<Record<GeAttribute, number>>` to `Course`, defaulting to 1. The engine counts `weight` instead of 1 per assignment, and `distinctTerms` applies per *assignment*, not per course. | One optional field; additive, so no `schemaVersion` bump. Engine change is small and local to the `attribute` evaluator. |
| B | Encode the nineteen courses as a `courseSet` exception inside the GE program JSON. | Keeps the contract still, but puts a data fact in a requirement — and ADR rule 2 says requirements are data, not that data is requirements. It also does not generalise if another attribute ever doubles. |
| C | Drop `distinctTerms` for PE. | Wrong for the right reason: the constraint exists so a student cannot close PE in one term with two ordinary courses. Removing it to fix nineteen courses breaks the rule for all 241. |

**Recommended: A.** It is additive, it says the true thing (this course is worth
two PE courses), and it leaves `distinctTerms` doing its real job.

**Blocked on the Registrar either way.** I have verified *that* the export says 2;
nobody has confirmed what the Registrar MEANS by it. Encode it
`confidence: draft` until they answer — this is exactly the case that field exists
for. I have not implemented any of the three options.

**Scope note:** the fix spans `packages/shared` (the `Course` field),
`packages/engine` (the `attribute` evaluator, frontend's), and this pipeline
(populating the weight). It is not mine to make unilaterally.

---

## HANDOFF-3 — agent/backend — 2026-09-11 (round 2)

### Summary
Round-2 fixes against ADR-016/ADR-017 and the reviewer's round-1 findings.
M-5 (first priority), H-2, H-3, H-4, M-4 and L-7/L-10 are closed. H-5 is a
product decision, not code. H-6 has a CONTRACT CHANGE REQUEST above, as asked.

**The most important thing in this handoff is a defect I introduced and removed.**
Implementing AC-B00 I also pruned non-PO courses with no section in an ingested
term, reading ADR-016's "non-Pomona courses enter only via a section in an
ingested term" as a retention rule. Measured against the real catalog, that
deleted **72 courses, 37 of them carrying GE attributes** — `AFRI 010 AF`
(AREA_3 + ANALYZING_DIFFERENCE), `CHST 028 CH` (AREA_3 + SPEAKING_INTENSIVE), and
`CHST 055 CH`, which AC-B00 names explicitly as a course that must survive. Entry
and retention are not the same thing: sections cover upcoming terms, a student's
record reaches years back, and deleting a course they already took makes the
engine answer `unmet` for a requirement they satisfied. I removed the prune. That
is the third instance of this trap in one round — the `test` substring, the `PREG`
department, and this — and it is the one that was mine.

### Tasks Completed (round 2 fixes)
- **M-5 / AC-B00** — membership is enforced by `src/placeholders.ts` for BOTH
  writers of `catalog.json`, so it cannot hold on one source and lapse on the
  other, which is how M-5 happened. Rules are exactly ADR-016's and no wider:
  non-Active status, `id.department === "TEST"`, title beginning `DNR:`, plus an
  exact-courseKey denylist (`data/catalog-denylist.json`, seeded with
  `THEA 007 PO`). No pattern rule catches a single record. Anything else that
  merely looks like a placeholder is reported and kept.
- **H-2 / AC-B01** — the floor is the pinned predicate: courses with
  `id.affiliation === "PO"` in the finished catalog after every exclusion,
  floor 1,900. **Measured 2,004.**
- **AC-B01b** — exclusion ceiling of 25; **5 dropped today**. This is the guard
  that catches a filter eating real courses; the floor never would, since
  deleting six of 2,005 still clears 1,900.
- **H-3 / AC-P09** — divergences carry a SHAPE, not a restatement. Seven shapes,
  each with a count, a sample showing both sides, and one sentence on which
  source is likelier right and why that follows from the shape.
  **Unclassified: 0**, and a non-zero unclassified count now fails the validator.
- **H-4 / AC-B03** — `exclusionAnomalies` tested `credits.max < 1`, skipping
  0.5–1 courses; `GEOL 189V PO` (0.5–1, AREA_4) never reached the report. Keyed
  on `credits.min` now.
- **M-4** — `PIPELINE_MAX_DIVERGENCES` defaults to 300 per ADR-016, so
  `pipeline:all` completes under its own documented default; the hard-coded
  `"300"` is gone from the workflow, which now inherits it.
- **L-7** — `1P1..1P10` were allowlisted as "PE activity codes". False: of the 123
  FA2026 sections carrying a `1P<digit>` code, **122 carry no `1PE`**, and they sit
  on Art History and Art courses. The allowlist was manufacturing validator 4's
  "0 unrecognised codes". Reported with counts now; `1DDP` stays allowlisted.
- **L-10** — a garbled `Measure Values` is still coerced to absent (the safe
  direction) but is now counted, so a format change cannot pass as a silent pile.
- **L-1 / L-6** — this handoff. Figures below are re-measured, not restated.

### Files Changed
`packages/pipeline/src/placeholders.ts` (new), `validators/divergenceCategory.ts`
(new), `data/catalog-denylist.json` (new), `test/acceptance.catalog.test.ts` (new),
`test/placeholders.test.ts` (new), plus `commands/{catalog,sections}.ts`,
`validators/{geAgreement,exclusionAnomalies}.ts`, `hyperschedule/geCodes.ts`,
`registrar/parseCsv.ts`, `env.ts`, `.github/workflows/pipeline.yml`, `/data`.
Not touched: `packages/shared`, `docs/API.md`, `docs/ACCEPTANCE.md`,
`docs/DECISIONS.md`, `data/programs/`, `docs/tasks/INDEX.md`.

### Contracts
Unchanged. One OPEN request above (H-6). `data/catalog-denylist.json` is a new
pipeline input, hand-maintained, one exact key per line with a reason.

### Verification
Run fresh, immediately before this handoff, with no work after it.
```
typecheck 0 · lint 0 · build 0 · seed 0 · pipeline:all 0 · contract-test.sh 0
npm test  -> 373 tests (360 pipeline + 13 shared), 0 failures

AC-B01  (pinned predicate)            2004 PO courses      floor 1900   PASS
AC-B01b exclusions                    5 excluded           ceiling 25   PASS
AC-B00  department TEST               0                                 PASS
AC-B00  titles beginning DNR:         0                                 PASS
AC-B00  THEA 007 PO present           False (exact-key denylist)        PASS
AC-B00  AKP courses surviving         13                                PASS
AC-B00  ENGL 170R PO attributes       ['AREA_1', 'WRITING_INTENSIVE']   PASS
AC-P09  unclassified divergences      0   (282 total, 7 shapes)         PASS
AC-B04  FA2026 sections               2163                 floor 2000   PASS
AC-B05  offering history              1414                 floor 1400   PASS

ge-divergences.md shapes:
  area-only-in-registrar 139 | missing-from-registrar-export 47
  missing-from-catalog 25 | overlay-only-in-coursedog 23
  overlay-only-in-registrar 23 | mixed 22 | area-only-in-coursedog 3
```

### What Was NOT Verified
- **AC-B07 remains unverified.** No git remote, no `actionlint`, no `act`; the
  workflow has still never executed. Structure reviewed only.
- **H-5 (SP2027) is untouched** — upstream still 404s, `upcomingTerms` is
  `["FA2026"]`. The reviewer called it a product decision and I agree; there is
  no code fix, and I have not invented one.
- **H-6 is NOT implemented** — contract request only, and it needs the Registrar
  to confirm what `Measure Values = 2` means before anyone encodes it.
- **AC-B03's hardcoded figures still do not reproduce.** The AC wants "3 senior
  exercises, 10 non-Area-6 partial-credit". After the `credits.min` fix I measure
  **4 senior exercises and 6 partial-credit** against the 2,980-course catalog. The
  reviewer independently got different numbers again from the registrar export
  (18 in range, 2 PO). The three populations differ, so the AC's figures need
  re-measuring against a named source rather than the validator being bent to hit
  them. **Flagging, not fixing** — the AC is the manager's.
- `--from-csv` column names are still unverified against a real UI export.
- The three client-rendered catalog pages still cannot be verified live.

### Known Issues
- `validate-artefacts.ts` under-reports its own coverage (reviewer L-4). It is in
  `packages/shared`, which I do not own — left alone deliberately.
