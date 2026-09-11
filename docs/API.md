# Data and Engine Contract — Pomona GradGuide

**There is no HTTP API on this project.** There is no server. This document is
the contract for the two boundaries that exist:

1. **Pipeline → web app:** static JSON artefacts in `/data`, served by the web
   app from its own origin.
2. **Engine → web app:** two pure functions exported by `@gradguide/engine`.

## The authoritative artifact (contract-first)

| | |
|---|---|
| **Authoritative** | `packages/shared/src/*.ts`: zod schemas and the TypeScript types inferred from them |
| **Generated twin** | `docs/openapi.yaml`, produced by `npm run contract:openapi`. Committed. CI fails if stale. Never edited by hand. |
| **Prose twin** | this file. If it disagrees with the schemas, the schemas win and the disagreement is a defect to report. |
| **Enforcement** | `scripts/contract-test.sh`: regenerates and diffs `openapi.yaml`, then validates every file in `/data` against the schemas. Exit 0 valid, 1 invalid, 2 could not verify. |
| **Owner** | manager. Nobody else edits `packages/shared`. |
| **Change procedure** | `docs/AGENT_PROTOCOL.md` section 6: `## CONTRACT CHANGE REQUEST` in your handoff, task `BLOCKED` with `blocked_on: contract`. The manager changes the schemas, regenerates, records an ADR. |

| Boundary | Provider | Consumer(s) | Verified by |
|---|---|---|---|
| `/data/*.json` | backend (pipeline) for generated files; manager for `programs/*` and `external-credit-rules.json` | web app; engine (via the app) | `scripts/contract-test.sh`; pipeline schema validation at write time; the app's zod parse at load time |
| `evaluate()` / `resolveExternalCredit()` | frontend (engine package) | web app | golden-file tests in `packages/engine`; `Result` validated against `ResultSchema` in tests |
| `StudentPlan` (localStorage, export file, share link) | web app | web app (future versions of itself) | `StudentPlanSchema` on every import; migration tests |

Every schema below is named exactly as in `docs/openapi.yaml#/components/schemas`
and in `SCHEMAS` in `packages/shared/src/registry.ts`.

---

## 1. Static artefacts

All paths are relative to the web app's own origin. The app makes **no other
network requests**. A `Content-Security-Policy` with `connect-src 'self'` makes
any accidental one fail loudly.

| Path | Schema | Who writes it | Freshness |
|---|---|---|---|
| `/data/manifest.json` | `Manifest` | pipeline (`pipeline:manifest`) | nightly |
| `/data/catalog.json` | `CatalogArtefact` | pipeline (`pipeline:catalog`) | per catalog year; re-fetched nightly, changes rarely |
| `/data/sections-{term}.json` | `SectionsArtefact` | pipeline (`pipeline:sections`) | nightly, one file per term in `manifest.upcomingTerms` |
| `/data/offering-history.json` | `OfferingHistoryArtefact` | pipeline (`pipeline:history`) | nightly |
| `/data/programs/{programId}.json` | `Program` | **manager**, hand-written | on review |
| `/data/external-credit-rules.json` | `ExternalCreditRules` | **manager**, hand-written | on review |

Not part of the contract (never fetched by the app): `data/reports/*` (validator
output for humans), `data/sources/*` (committed inputs).

### Catalog membership and identity (ADR-016)

**`courseKey(course.id)` is unique within `courses`.**

Which upstream records become courses:

- **Pomona.** Coursedog records with `status === "Active"` only. `Banked` and
  `Inactive` records are administrative placeholders (`PE WAIVER`,
  `REG PENDING`, `Your Course 101`), 29 of which carry no `subjectCode` at all.
  Excluded counts are logged by status and written to `data/reports/`.
- **The other Claremont colleges.** A course enters only through the
  Hyperschedule merge, i.e. it has at least one section in an ingested term.
  Records whose `department` is `TEST`, or whose title begins `DNR:`, are
  dropped and listed in `data/reports/catalog-excluded.md` (reviewer M-5).
  Anything else that looks like a placeholder is **reported, never silently
  dropped** - the owner decides.

**Duplicate editions.** The upstream carries several editions of one course,
distinguished only by a year suffix on `_id`; among Active records 139 groups
hold more than one, and 56 disagree on GE attributes. In 55 of those 56, taking
the highest year **discards the attributes and keeps an empty record** - which
would make the engine answer `unmet` for a requirement the student satisfied. So
the winner is the **most complete record**, in this order:

1. most GE attributes;
2. then a non-empty `description`;
3. then the highest `_id` edition.

Discarded records are listed in `data/reports/catalog-duplicates.md`.

**Attribute tokens.** Coursedog `attributes[]` entries are semicolon-delimited
composites (`"PO Area 2 Requirement ;All Government/Politics ;Politics"`), so the
map is keyed on the split-and-trimmed token. The complete Pomona GE vocabulary is
twelve tokens - `PO Area 1..6 Requirement`, `PO Writing Intensive Req`,
`PO Speaking Intensive`, `PO Analyzing Difference`, `PO Language Requirement`,
`PO Phys Ed Requirement`, `PO Community Partnership` - plus `PO DDP Courses`,
which is dropped exactly as Hyperschedule's `1DDP` is. A token that is known to
be non-GE may be allowlisted **only** with a comment saying why; every token that
is neither mapped nor allowlisted must be **reported with its count**, never
silently dropped (reviewer D-08).

A record that cannot be represented - `ENGL195B PO` has an empty `name` against
`title: z.string().min(1)` - is dropped and counted as a normalise issue. Do not
invent a title.

### Load order and failure states

1. `GET /data/manifest.json` → parse with `ManifestSchema`. Failure (404, not
   JSON, schema mismatch) → the app renders the **data-unavailable state**: the
   masthead, the disclaimer, and a specific message naming the file. Never a
   blank page, never a spinner forever.
2. In parallel: `catalog.json`, every `programs/*.json` listed in the manifest,
   `external-credit-rules.json`. Same failure rule per file.
3. Lazily, when "What satisfies this?" first opens: `sections-{term}.json` for
   the chosen term, and `offering-history.json`. Failure → the candidate list
   shows the **term-data-unavailable state** ("Section data for SP2027 is not
   available; showing all catalog candidates") rather than an empty list.

The app shows `manifest.generatedAt` as "data as of" and compares
`manifest.catalogYear` with the current date: when the catalog year's end year
is before the current academic year, the **staleness banner** appears.

### Envelope

Every generated artefact carries `meta: ArtefactMeta`:

```json
{
  "schemaVersion": 1,
  "generator": "@gradguide/pipeline@0.1.0 catalog",
  "generatedAt": "2026-09-09T06:12:03Z",
  "fetchedAt": "2026-09-09T06:11:41Z",
  "sourceUrl": "https://app.coursedog.com/api/v1/cm/pomona/courses/search/$filters?catalogId=eziiW38FfLsoDlBqEZgV&…",
  "catalogYear": "2026-2027"
}
```

### Identity

`CourseId` is decomposed, never a string, and `courseKey()` is the only
canonical string form: `"CSCI 062A PO"`, `"ID 001 PO"` (three-digit zero-padded
number, suffix attached, one space, affiliation). `TermId` is `{ year, term }`
with `termCode()` → `"FA2026"`. `compareTerms` orders chronologically:
`SP2026 < FA2026 < SP2027`. Affiliation `EXT` marks a course from an external
institution that is not in the catalog.

### `CatalogArtefact` — `/data/catalog.json`

`{ meta, courses: Course[] }`, `courses` non-empty by contract. **The catalog
contains every 5C course a Pomona student can count**, not only Pomona's: a
Scripps course tagged Area 2 satisfies Area 2. Pomona (`PO`) entries come from
Coursedog with full descriptions; entries for the other colleges are built from
Hyperschedule sections (title, credits, attributes from Pomona GE codes,
`description: ""`, `sourceUrl` at Hyperschedule). TASK-010 writes the PO set and
preserves the rest; TASK-012 merges the rest. `Course.attributes`
are the Registrar's GE tags mapped to `GeAttribute` and already reflect the
catalog's eligibility exclusions (senior exercises, independent studies,
Critical Inquiry, lower-division language carry no Area tag). **The engine adds
no exclusion logic; the pipeline's validators flag the ~13 anomalies for human
review instead.** `prereqText` is display-only prose. `prereqRule` is present for
the ~5% of courses with structured requisites and is advisory only.

```json
{
  "id": { "department": "CSCI", "courseNumber": 51, "suffix": "", "affiliation": "PO" },
  "title": "Introduction to Computer Science",
  "description": "…",
  "department": "Computer Science",
  "credits": { "min": 1, "max": 1, "repeatable": false, "maxRepeats": 0 },
  "attributes": ["AREA_5"],
  "gradeMode": "Letter",
  "prereqText": null,
  "prereqRule": null,
  "catalogYear": "2026-2027",
  "sourceUrl": "https://catalog.pomona.edu/courses/CSCI 051 PO",
  "lastVerified": "2026-09-09T06:11:41Z"
}
```

### `SectionsArtefact` — `/data/sections-{term}.json`

`{ meta, term: TermId, sections: Section[] }`. `Section.geCodes` are the raw
Hyperschedule course-area codes (`"1A3"`, `"1ADR"`, …); the pipeline maps them
through `HYPERSCHEDULE_GE_CODES` and reports every disagreement with
`Course.attributes`. The app uses sections only to answer "is this course
offered in this term" and to show seats and instructors.

### `OfferingHistoryArtefact` — `/data/offering-history.json`

`{ meta, asOfTerm, knownTerms: TermId[], history: OfferingHistory[] }`. The app
draws the **term ribbon** over the last eight entries of `knownTerms`, filled
where the course's `terms` include that term.

### `Manifest` — `/data/manifest.json`

Lists every artefact with its `fetchedAt`, the `programs` available (id, path,
kind, name, confidence), and `upcomingTerms` (ascending, each with a sections
file). `upcomingTerms` is what "What satisfies this?" offers as its term filter;
the default is the first entry.

### `Program` — `/data/programs/{programId}.json`

Requirements as data. The full type is in `packages/shared/src/program.ts`. The
fields the engine and UI depend on:

| Field | Meaning |
|---|---|
| `requirements[].rule` | a `Rule` (section 2.2) |
| `requirements[].overlapPolicy` | which other requirements may reuse a course counted here |
| `requirements[].appliesWhen.studentType` | applicability; a non-applicable requirement returns `satisfied` with `waived: true` |
| `requirements[].attestable.prompt` | the student may self-certify this requirement; `viaAttestation: true` |
| `requirements[].sourceQuote` + `sourceRef` | verbatim catalog text and the snapshot it must be a substring of |
| `requirements[].confidence` | overrides `Program.confidence` for this row |
| `constraints[]` | cross-requirement constraints, e.g. `distinctDepartments` over the six Breadth areas |
| `advisories[]` | rules not evaluated in P0, rendered as notes |

### `ExternalCreditRules` — `/data/external-credit-rules.json`

`subjects[]` (the exams a student can pick), `rules[]` (each with an `ExamMatch`
and an `effect` of `credit` or `attribute`), and `caps`. Section 2.4 gives the
resolution semantics.

---

## 2. Engine contract (`@gradguide/engine`)

Pure. Deterministic. No I/O, no `Date.now()`, no randomness, no DOM. Runs
identically under vitest in Node and in the browser.

### 2.1 Signatures

```ts
evaluate(plan: StudentPlan, programs: Program[], catalog: Course[]): Result[]
resolveExternalCredit(input: ExternalCreditInput, rules: ExternalCreditRules): ExternalCredit
```

`evaluate` returns one `Result` per requirement of every program passed, in
program order then requirement order, with `programId` set. The UI passes the GE
program plus any `plan.declarations` (empty in P0).

Both functions **never throw** on valid inputs. Unknown course ids, courses not
in the catalog, unimplemented rule kinds and malformed overrides all produce a
`Result` (typically `unverifiable` with a `note`) rather than an exception.
Inputs are assumed to have passed the zod schemas; the app validates on load
and on import.

### 2.2 Rule semantics

Course lookup: a `CompletedCourse` is matched to the catalog by `sameCourse`.
When it is not in the catalog (transfer, `EXT`), its own `credits` (default 1),
`title` and `attributes` (default none) are used.

A completed course **counts** only when `isPassing(grade)` (any letter grade
above F, or CR/P). In-progress grades (`IP`, `N`) never count toward a
requirement but are listed as the student's own courses in the UI.

`grade: null` means the student did not record a grade and **is treated as
passed**. Entering grades is optional by design (ADR-015): the app never asks
for them, so a course the student did not pass must carry its grade explicitly.
`isPassing(null)` is `true`.

| Kind | Status rule | `satisfiedBy` | `remaining` | `candidates` |
|---|---|---|---|---|
| `course` | `satisfied` when the student completed exactly that course with a passing grade (and `minGrade` if present, letter grades only); else `unmet` | the course | `null` | the course itself if not completed |
| `attribute` | count completed courses carrying `attr` that pass `filter`, plus granted attributes from qualifying `externalCredits` (each grant counts as one course, or as `credits` when `unit` is `credits`). `unit: courses` (default) compares count to `n`; `unit: credits` sums credit values. `distinctTerms` requires the counted courses to be from different terms. `satisfied` when ≥ `n`; `partial` when > 0; else `unmet` | the assigned courses (see 2.3) | `{ n - have, unit }` | catalog courses carrying `attr`, not completed, not assigned elsewhere under the overlap policy |
| `credits` | sum credits of completed courses passing `filter` (default: all completed courses), plus external credits when `includeExternal` is true (default: true when no `filter`, else false), subject to `caps` (2.4). `satisfied` when ≥ `n`; `partial` when > 0; else `unmet` | `[]` (aggregate) | `{ n - have, "credits" }` | `[]` |
| `gpa` | **`scope: "overall"`** averages every qualifying completed course: letter-graded, provenance `pomona`, `claremont` or `abroad`, weighted by credits, on `GRADE_POINTS`. `satisfied` when ≥ `min`; `unmet` otherwise; **`unverifiable`** with a note when there are no letter grades. **`scope: "program"` is deferred to P1** and returns `unverifiable` with a note, exactly like the deferred rule kinds, because the engine cannot yet tell which courses count toward a program (ADR-014). No GE requirement uses this kind: the 2.00 rule is carried as an advisory (ADR-015) | `[]` | `null` | `[]` |
| `attested` | `satisfied` when `plan.attestations[id] === true`; else **`unverifiable`** with `note = prompt` | `[]` | `null` | `[]` |
| `allOf`, `anyOf`, `chooseN`, `fromSet`, `milestone`, `not` | **`unverifiable`**, `note: "rule kind '<kind>' not yet supported"` | `[]` | `null` | `[]` |

`CourseFilter` fields are ANDed:

- `provenance`: the course's provenance must be listed.
- `transferPolicy: transferStudentsPreMatriculation`: a `transfer` course
  otherwise excluded by `provenance` counts when `plan.studentType === "transfer"`
  and `compareTerms(course.term, plan.matriculationTerm) < 0`.
- `attributes`: the course must carry all of them.
- `minTerm`: `compareTerms(course.term, minTerm) >= 0`.
- `sinceMatriculation`: `compareTerms(course.term, plan.matriculationTerm) >= 0`.
  External credit never counts under this filter.
- `partialCredit: exclude`: courses with credit value < 1 do not count.

### 2.3 Assignment: constrained-first with bounded backtracking

Course-selecting rules (`course`, `attribute`; later `fromSet`, `chooseN`)
compete for the student's completed courses. Aggregate rules (`credits`, `gpa`)
do not participate; they sum over all qualifying courses regardless of
assignment.

1. Compute, for every course-selecting requirement, its eligible courses.
2. Process requirements in ascending order of eligible-course count
   (**constrained first**). Assign courses respecting every `OverlapPolicy`
   involved (a course assigned to A may be assigned to B only if A's policy
   allows B and B's policy allows A) and every `Program.constraints` entry
   (`distinctDepartments`: two requirements in the group may not be satisfied by
   courses with the same `CourseId.department`).
3. If any course-selecting requirement ends `unmet` or `partial` while an
   alternative assignment exists, backtrack with a bounded search (depth bound
   equal to the number of course-selecting requirements; at ≈32 courses and
   ≈15 requirements this is microseconds). **No solver dependency.**
4. Rank candidate assignments lexicographically:
   1. **maximize** the number of requirements satisfied;
   2. **minimize sharing** — the number of (requirement, course) pairs whose
      course is also counted for another requirement. Prefer distinct courses
      where distinct courses exist, so a course with a rare attribute is
      credited for the rare requirement and a common course fills the common
      slot. Sharing is still produced when nothing else can satisfy a
      requirement, which is the normal case for the overlay requirements;
   3. deterministic tie-break by `courseKey` ascending.

   **This corrects an earlier version of this step**, which said to prefer the
   assignment leaving the most courses unassigned. That maximised sharing and so
   produced the exact outcome its own rationale said to avoid: with `HIST 101 PO`
   (Area 3 only) and `AMST 110 PO` (Area 3 + Analyzing Difference), it credited
   `AMST 110 PO` to both and left `HIST 101 PO` unused. The verdicts were right
   and the attribution was wrong, and AC-P01 makes attribution a headline
   feature. See ADR-013 and fixture F-06.

Fixture 6 in `docs/ACCEPTANCE.md` is the test: naive greedy must fail it,
constrained-first must pass it.

Overlap defaults: `allowAll`. `exclusive` means the course counts here and
nowhere else. `denyOnly` / `allowOnly` list requirement ids.

### 2.4 Manual results, waivers, external credit

- **Overrides win.** An `Override` for requirement R marks R `satisfied`,
  `satisfiedBy: [override.course]`, `viaOverride: true`, regardless of the rule.
  The overridden course is removed from the assignment pool for other
  requirements unless R's overlap policy allows them.
- **Attestations.** When `requirement.attestable` exists and
  `plan.attestations[requirement.id] === true`, the result is `satisfied`,
  `viaAttestation: true`, `note: attestable.prompt`. An `attested` *rule* works
  the same way keyed by the rule's `id`.
- **Waivers.** When `appliesWhen.studentType` is present and excludes
  `plan.studentType`, the result is `satisfied`, `waived: true`,
  `satisfiedBy: []`, with a note naming the reason. The UI renders waived rows
  as manual/neutral, never as an automatic match.
- **External credit.** `resolveExternalCredit(input, rules)`:
  1. Find `rules.subjects` entry by `input.subjectKey`. Unknown → `qualifies:
     false`, `notes: ["unknown exam"]`.
  2. For each rule whose `match` holds (all present fields must match: `kind`,
     `category`, `ibGroup`, `levels` contains `input.level`, `minScore ≤
     input.score`, `minGrade` on `gradeScale`, `excludeRomanizedScript` vs
     `subject.romanizedScript`, `subjectKeys` / `excludeSubjectKeys`):
     `effect: credit` sets `credits = duration === "year" ? 1 : 0.5`;
     `effect: attribute` unions `grantsAttributes`.
  3. `duplicateKey = subject.duplicateKey`, `qualifies = credits > 0 ||
     grantsAttributes.length > 0`, `ruleIds` lists what fired, `notes` explains
     what did not (e.g. "IB Standard Level earns no advanced standing credit").
  Inside `evaluate`, when summing external credit for a `credits` rule: only one
  credit per `duplicateKey` (the largest), then `caps.advancedStandingCredits`,
  then `caps.externalCredits` applied to transfer coursework plus advanced
  standing combined. Transfer coursework (`provenance: transfer`) also obeys
  `caps.externalCredits` and, for the catalog's 16-course limit, is counted in
  courses of credit value ≥ 1. Cumulative (partial-credit) courses obey
  `caps.partialCreditCourseCredits` and `caps.partialCreditCourses`.
  Granted attributes from qualifying external credit count toward `attribute`
  rules exactly like a completed course carrying that attribute, and their
  `Result.satisfiedBy` entry is the pseudo-id
  `{ department: "EXAM", courseNumber: 0, suffix: "", affiliation: "EXT" }`
  so the UI can render "satisfied by AP Spanish Language (5)".

### 2.5 `Result`

```json
{
  "programId": "general-education-2026",
  "requirementId": "area-3",
  "status": "unmet",
  "satisfiedBy": [],
  "remaining": { "n": 1, "unit": "courses" },
  "candidates": [{ "department": "HIST", "courseNumber": 101, "suffix": "", "affiliation": "PO" }, "…"],
  "children": [],
  "confidence": "verified"
}
```

`confidence` is copied from the requirement (or the program). `note` carries the
human-readable reason for `unverifiable`, a waiver, or a constraint violation;
`violations` lists constraint ids when an assignment could not avoid violating
one. `children` is empty in P0 (populated by `allOf`/`anyOf`/`chooseN` in P1).

### 2.6 Determinism

Same inputs → byte-identical `Result[]`. Arrays are ordered: `satisfiedBy` and
`candidates` by `courseKey` ascending. Golden files depend on this.

### 2.7 Bounded evaluation under unknowns

`term`, `grade`, `gradeMode` on a `CompletedCourse` and `matriculationTerm` on
the plan may be `null`, because the app does not ask for them (ADR-015). A rule
whose answer depends on a field that is unknown for at least one relevant course
is evaluated **twice**:

- **optimistic** — the unknown-term or unknown-grade courses are treated in the
  way most favourable to the student (their term is whatever the rule needs,
  their grade is passing);
- **pessimistic** — they are treated in the way least favourable (their term is
  whatever the rule least needs, e.g. the same term as another course for
  `distinctTerms`; their grade stays passing, since `null` means passed).

**The pessimistic pass may only consider values the unknown field could actually
take, given everything else known about the course.** An unknown term is not
unconstrained: the course's `provenance` already narrows it. This is a
correctness rule, not an optimisation — exploring impossible values produces
`unverifiable` answers to questions that were never in doubt.

The case that matters in P0 is `sinceMatriculation`. A course with `provenance`
`pomona`, `claremont` or `abroad` **cannot** predate matriculation: you cannot
cross-register at another Claremont College, or join a Pomona-run study-abroad
programme, before matriculating, and the College's own categories put
pre-matriculation college work somewhere else entirely — *"Advanced Standing
credit includes … college credits completed prior to admission and matriculation
to Pomona College or other college or university as a regular, degree-seeking
undergraduate"*. Such work is posted as advanced standing or transfer credit, so
it arrives in the plan as an `ExternalCredit` or as `provenance: transfer`,
never as unmarked Pomona coursework.

So under `sinceMatriculation`, an unrecorded term makes a course genuinely
unknown **only when its `provenance` is `transfer`**. For the other three
provenances both passes agree and the student is never asked for a term they do
not need to give. `minTerm` is unaffected: it takes an arbitrary term, so
provenance constrains nothing and both passes run as normal.

If both passes yield the same `status`, that status is returned and the student
is never troubled. If they differ, the result is **`unverifiable`**, with a
`note` naming the missing field and the affected courses, e.g. *"Add terms to
PE 001 PO and PE 002 PO to check that they were in different semesters."*

This is why term entry can be optional without the audit ever guessing. It
applies to `distinctTerms`, to `CourseFilter.minTerm` and `sinceMatriculation`,
and to the transfer pre-matriculation rule.

**Most students see no `unverifiable` row at all**, and with the constraint rule
above that sentence is now true rather than aspirational: a student whose record
is nothing but Pomona and Claremont course codes gets the same answer for every
credit rule whether or not they entered terms. The two things that do produce
one are a `provenance: transfer` course with no term (for
`sinceMatriculation`), and two Physical Education courses with no terms (for
`distinctTerms`) — both of which are genuinely undecidable, and both of which
name the specific courses whose term would settle it.

`matriculationTerm: null` is first **inferred** as the earliest known
completed-course term. If no course has a term, matriculation is unknown and the
two passes above decide.

---

## 3. Derived views the app computes (not engine)

- **Offered next term:** `candidates ∩ { s.course | s ∈ sections-{term} }`.
- **Dual purpose:** for a candidate C, the set of other requirements whose
  `Result.candidates` include C (status `unmet` or `partial`). Rendered as
  "also closes: Area 3".
- **Term ribbon:** `offeringHistory[C].terms ∩ knownTerms.slice(-8)`.
- **Empty-state counts:** for each `attribute` requirement, the number of
  catalog courses carrying the attribute.

---

## 4. Pipeline validators (backend), each failing the build loudly

| # | Check | Hard fail? | Output |
|---|---|---|---|
| 1 | Every fetched record parses with the shared schema; every emitted artefact re-parses | yes | first 20 issues in the log |
| 2 | Non-empty guard: zero courses, zero sections for a requested term, or HTTP 401/403 from Coursedog | yes, **keep yesterday's files** | log |
| 3 | Cross-source GE agreement: Coursedog `attributes` vs Registrar CSV per Pomona course. Every divergence is listed **and assigned a named category**, with a count per category and which side is more likely right. Neither source is preferred | warn (fail if the count exceeds `PIPELINE_MAX_DIVERGENCES`, **default 300**). The measured steady state is ~260 of ~2,000 PO courses: the guard exists to catch a jump above the known baseline, not to fire on the baseline (ADR-016) | `data/reports/ge-divergences.md` |
| 4 | Hyperschedule `geCodes` vs catalog `attributes` per course | warn | `data/reports/hyperschedule-attribute-diff.md` |
| 5 | Exclusion anomalies: senior exercises (190–199) with an Area tag; partial-credit courses with a non-Area-6 Area tag; any course with two Area tags (`THEA085 PO`) | warn | `data/reports/exclusion-anomalies.md` |
| 6 | Provenance stamping: every artefact has `meta` with `fetchedAt`, `sourceUrl`, `catalogYear` | yes | – |
| 7 | Source quotes: every `sourceQuote` in `data/programs/*.json` and `external-credit-rules.json` is a whitespace-normalised substring of its `sourceRef.slug` snapshot; snapshots re-fetched and diffed | yes | `data/reports/source-quotes.md` |
| 8 | Manifest consistency: every listed path exists and validates; every `upcomingTerms` entry has a sections file | yes | – |

`data/reports/validation.json` (`ValidationReport`) summarises every run.

---

## 5. Errors

There are no HTTP error bodies (static files). The failure states are UI states
(section 1) and pipeline exit codes (non-zero on any hard fail, with the
previous artefacts untouched). `scripts/contract-test.sh` exits 2, never 0, when
it could not verify.

---

## 6. Versioning

- `ArtefactMeta.schemaVersion` and `StudentPlan.schemaVersion` are integers.
  Additive fields do not bump them; a rename, removal or semantic change does.
- The app must migrate any older `StudentPlan` it can (`docs/DATABASE.md`) and
  refuse, with a specific message, any newer one.
- `Rule` kinds are only ever added, never renamed. Deferred kinds are already in
  the union so P1 adds evaluators, not data migrations.

## 7. Contract-first checklist (manager, 2026-09-08)

- [x] Consumer and provider owners known (tables above)
- [x] One authoritative artifact named (`packages/shared`)
- [x] Required fields, nullability, enums, failure states explicit (schemas + section 1)
- [x] Consumer types derive from the contract (`z.infer`, no handwritten copies)
- [x] Provider output verified against the contract (`contract-test.sh`, pipeline validator 1)
- [x] Alternate paths covered: missing artefact, missing term, stale data, unknown exam, deferred rule kinds
- [x] Versioning policy stated (section 6)
- [ ] Both sides pass against the same contract before integration (manager verifies at integration)
