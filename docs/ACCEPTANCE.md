# Acceptance Criteria — Pomona GradGuide P0

The reviewer gates against this file and against the per-task criteria in
`docs/tasks/`. Every criterion is checkable by someone who did not build it;
each names its evidence. Criteria are cited by ID in handoffs and reviews.

Source: `PROJECT_BRIEF.md` §13 and §14, corrected against the 2026-27 catalog
text snapshotted in `data/sources/catalog-pages/` on 2026-09-08.

---

## Product (the eleven from the brief, plus what the catalog and owner added)

- [ ] **AC-P01** A student can enter completed courses and see all GE requirements evaluated, with the satisfying course named for each satisfied requirement. Evidence: `docs/review/R-01-desktop-1440.png` showing at least six satisfied rows each naming a course.
- [ ] **AC-P02** Every requirement's verbatim catalog `sourceQuote` is reachable in one click from its result, shown in the margin of the **expanded** row (ADR-011), and every quote in `data/programs/*.json` is a verbatim substring of its snapshot. Evidence: screenshot of an expanded row; `scripts/contract-test.sh` output (quote check).
- [ ] **AC-P03** Unmet requirements list candidate courses filtered to those offered in the selected upcoming term, with dual-purpose candidates marked ("also closes: …") and a term ribbon per candidate. Evidence: `docs/review/R-04-what-satisfies.png`.
- [ ] **AC-P04** `unverifiable` renders distinctly (slate, dashed row, glyph, word) and shows the prompt that would resolve it instead of guessing. Evidence: `docs/review/R-NN-state-unverifiable.png`.
- [ ] **AC-P05** Manual overrides and attestations work and are visually distinguishable from automatic matches (plum, labeled "override"/"attested", approver or prompt shown). Evidence: screenshot of an override row beside an automatic row.
- [ ] **AC-P06** The plan persists across a hard reload; export and re-import round-trip losslessly (byte-identical JSON after import). Evidence: reviewer's console transcript in `docs/review/R-console.txt` with the diff command.
- [ ] **AC-P07** **No network request carries student data.** Every request during the primary flow is a same-origin GET of `/data/*`, a font/asset, or nothing. The CSP `connect-src 'self'` is present. Share links carry the plan in the URL **fragment**. Evidence: `docs/review/R-network.txt` (HAR summary or copied network tab) for the full demo flow including share-link open.
- [ ] **AC-P08** The nightly pipeline runs green, emits stamped artefacts (every file has `meta.fetchedAt`, `sourceUrl`, `catalogYear`), and **fails loudly** on HTTP 401 or empty results, leaving the previous artefacts untouched. Evidence: a green workflow run URL plus a deliberately failing run (bad Origin header) showing non-zero exit and unchanged `data/`.
- [ ] **AC-P09** Cross-source GE validation (Coursedog vs Registrar CSV) reports **zero uncategorised** divergences, where a category is a **shape**, not a restatement of the divergence.

  The v0 report already had three named buckets — "attribute sets differ" 210, "missing from Registrar export" 47, "missing from catalog" 25 — and the first, at 74% of the report, is not a category: it says only that they differ (reviewer, 2026-09-11). Judging "which source is more likely right" for a bucket that heterogeneous is either impossible or a paragraph of hand-waving that passes the criterion and tells the Registrar nothing.

  So the "attribute sets differ" bucket must be **subdivided by shape** before any which-source judgment attaches. At minimum:

  | Shape | Example |
  |---|---|
  | same count, different area | catalog `AREA_3`, Registrar `Area 2` |
  | catalog carries an extra overlay | catalog `AREA_2 + WRITING_INTENSIVE`, Registrar `Area 2` |
  | Registrar carries an extra overlay | the reverse |
  | catalog carries an area the Registrar does not | catalog `AREA_4`, Registrar none |
  | Registrar carries an area the catalog does not | the reverse |
  | disjoint sets | no overlap at all |

  Each shape carries its count, a sample row showing both sides, and one sentence on which source is more likely right **and why that follows from the shape**. Any divergence not fitting a named shape goes in an explicit `unclassified` bucket, and **that bucket's count is the number AC-P09 requires to be zero**.

  The raw total (~260 of ~2,005 PO courses) is not itself a defect: the two sources have always disagreed, and this report is what the Registrar courtesy review is built on. Evidence: the report file.
- [ ] **AC-P10** Golden-file engine tests pass for the whole fixture set below. Evidence: pasted `vitest` output naming each fixture.
- [ ] **AC-P11** **Adding a hypothetical major requires only a new JSON file.** A fixture major that uses only P0 rule kinds evaluates correctly with no change to engine or app code, and the app lists it when it appears in the manifest. Evidence: the fixture file path, the passing test, and `git diff --stat` for the commit that added it showing only `data/` and test files.
- [ ] **AC-P12** **One page.** No router, no tabs, no navigation to other views. Every screen in the brief is a section or an inline disclosure. Evidence: `grep -r "react-router\|createBrowserRouter" apps/web/src` returns nothing; screenshots show one continuous page.
- [ ] **AC-P13** The masthead shows the catalog year and "data as of {manifest.generatedAt}"; the staleness banner appears when the manifest's catalog year is older than the current academic year (test by editing the manifest); the disclaimer reads exactly "The Registrar's official audit is the source of truth. Confirm with your advisor before registering." and links to the portal; Hyperschedule is attributed with its licence notice. Evidence: screenshots of both banner states.
- [ ] **AC-P14** The empty state is useful: before any course is entered it shows the full GE structure with real course counts per attribute requirement ("Area 5: 307 courses"). Evidence: `docs/review/R-NN-state-empty.png`.
- [ ] **AC-P15** The Breadth `distinctDepartments` constraint is enforced: a plan with DANC courses tagged Area 1 and Area 6 and nothing else for either shows one of them unmet with a note naming the constraint. Evidence: fixture F-09 passes.
- [ ] **AC-P16** External credit resolves per the catalog: AP 3 does not qualify, AP 4 does; IB Language B SL 7 does not satisfy Language, IB Language A SL 7 does, IB HL 6 does and earns credit; IB SL never earns credit; a duplicate exam pair earns credit once; advanced standing is capped at 2 credits. Evidence: fixture F-03 and F-03b pass.

## v1 (2026-09-11) — owner feedback after reviewing the running app

These supersede any v0 criterion they contradict. Measurements are taken at
**1440x900 with the F-01 demo plan loaded** unless stated otherwise.

- [ ] **AC-V01** The requirement map is present above the detail rows, with twelve nodes in three labelled families (Breadth 6 / Overlays 3 / Foundations 3). Each node shows its state and, when satisfied, the course that satisfied it. Waived requirements are not drawn as nodes. Evidence: `docs/review/R-10-map-1440.png`.
- [ ] **AC-V02** Masthead + collapsed record + the entire map are visible **without scrolling** in a **1440x800 viewport**. Evidence: the screenshot, the measured pixel offset of the map's bottom edge, and the instrument read-back (below).

  **The instrument is part of the criterion** (ADR-017). Set the viewport with CDP `Emulation.setDeviceMetricsOverride`, never by resizing a window, and paste `window.innerWidth` and `window.innerHeight` read back from the page to prove what was actually measured. The reviewer hit this exact error in round 1: a macOS Chrome window resized to 1440x1000 reported `innerHeight` **823**, and a window resize floors at about 500px wide.

  **Why 800 and not 900:** a 1440x900 *display* yields roughly 765-800px of *viewport* once the macOS menu bar and Chrome's tab and address bars are subtracted. A criterion written against a 900px viewport can pass under emulation while the map sits below the fold on the owner's actual laptop, which is the only place it matters.
- [ ] **AC-V03** A collapsed requirement row is **<= 40px** and the map is **<= 320px** tall, measured in the browser with `getBoundingClientRect()` (not asserted, not eyeballed), under the same instrument as AC-V02. Evidence: the measurement commands and their output. The v0 build was 57px rows and a 1774px audit (reviewer M-06).
- [ ] **AC-V04** Clicking or pressing Enter on a map node expands that requirement's row below and scrolls it into view. No overlay, no modal, no route change. Evidence: before/after screenshots.
- [ ] **AC-V05** There is **no GPA row and no grade is ever requested**. The 2.00 sentence appears, verbatim, in the collapsed "Other degree rules" line. Evidence: screenshot of the expanded line; `grep -rn "gpa" data/programs/general-education-2026.json` shows it only under `advisories`.
- [ ] **AC-V06** A plan consisting only of course codes - no terms, no grades, no provenance touched - produces a correct audit. Term, grade and "Taken at" are behind a per-row `edit` disclosure and are absent from the default row. Evidence: screenshot of the default record; fixture F-13 passes.
- [ ] **AC-V07** Pasting a blob copied from the portal's academic history adds the courses: the parser finds codes, and any terms and grades, anywhere in the text, previews accepted and rejected lines with reasons, and adds nothing until confirmed. Evidence: unit tests over at least four real-world-shaped blobs, plus a screenshot of the preview.
- [ ] **AC-V08** Light is the default canvas with no stored preference; `color-scheme` follows `data-theme` in both directions; checkboxes render as checkboxes; at 390px opening "Add an exam" does not widen the layout viewport. Evidence: screenshots in both themes, and the 390px layout-viewport measurement before and after opening the exam control (reviewer D-02, D-03, M-07, M-08).
- [ ] **AC-V09** The advisories section is gone from the page body; its content is reachable from one collapsed "Other degree rules (n)" line in the footer, and each advisory that belongs to a requirement appears inside that requirement's expanded row. Evidence: screenshot.
- [ ] **AC-V10** Every map node is a keyboard-operable button with an `aria-label` naming requirement, status and next action ("Area 4, unmet, 1 more course, 2 offered in Spring 2027"). Status is never conveyed by hue alone. Evidence: the accessibility tree for the map pasted into the handoff.
- [ ] **AC-V11** Family hue is confined to family labels and their 1px brackets. If it reads as status at a glance, it was removed and the handoff says so (`docs/DESIGN_BRIEF.md`, Family hues).

## Frontend functionality

- [ ] **AC-F01** Every interface state in protocol §8 is present where relevant: default, loading (initial data fetch), empty (no courses), success, error (data unavailable, term data unavailable, corrupt plan, import failure, storage quota), disabled, hover, focus, active. Evidence: one screenshot per non-trivial state named `R-NN-state-<name>.png`.
- [ ] **AC-F02** Course entry: autocomplete opens on the first keystroke, matches department, number and title, shows GE attributes inline, commits on Enter; the list is keyboard-navigable. Evidence: screenshot with the popover open; keyboard-only transcript in the review notes.
- [ ] **AC-F03** Paste import accepts tab- or comma-separated rows in the shapes `code`, `code term`, `code term grade`, shows a preview of parsed rows and unparsed lines before adding, and never adds silently. Evidence: unit tests for the parser; screenshot of the preview.
- [ ] **AC-F04** Profile and external credit entry: matriculation term, student type, and exams from the subjects list with score/grade/level; each entered exam shows what it resolved to (credit, granted attribute, or why not). Evidence: screenshot.
- [ ] **AC-F05** Requirement rows sort unmet/partial to the top of their group and show remaining counts and candidate counts without expanding. Evidence: screenshot.
- [ ] **AC-F06** Responsive at 1440 / 768 / 390: at 768 the sidenote collapses beneath the row; at 390 the record is single-column and candidates stack with the ribbon beneath. Evidence: `R-01-desktop-1440.png`, `R-02-tablet-768.png`, `R-03-mobile-390.png`.
- [ ] **AC-F07** Light and dark themes both implement the palette in `docs/DESIGN_BRIEF.md`; status is never carried by color alone (glyph + word always present). Evidence: dark-mode screenshot; axe or equivalent contrast check pasted.
- [ ] **AC-F08** Browser console is clean of errors and CSP violations during the primary flow. Evidence: `docs/review/R-console.txt`.
- [ ] **AC-F09** The share link decodes in a private window to an identical plan, prompts before replacing a stored plan, and clears the fragment after import. Evidence: screenshot and network evidence (AC-P07).

## UI/UX

- [ ] **AC-U01** The signature element (margin of evidence) is present on every requirement row at 1440 and as a disclosure at 768/390.
- [ ] **AC-U02** The term ribbon is present on every candidate in "What satisfies this?".
- [ ] **AC-U03** The implementation is recognizable as its reference points: a document with ruled rows and sidenotes, dense like Hyperschedule, not a dashboard.
- [ ] **AC-U04** No overall percentage or donut anywhere; progress bars only for real counts.
- [ ] **AC-U05** No Pomona brand blue, seal or wordmark; the word "unofficial" is in the masthead.
- [ ] **AC-U06** No unjustified pattern from `docs/DESIGN_CONSTRAINTS.md`; `scripts/slop-check.sh` hits are each justified in the brief or removed.
- [ ] **AC-U07** Type: Source Serif 4 for headings and quotes, IBM Plex Sans for UI, IBM Plex Mono for codes, self-hosted; no runtime font request.

## Pipeline (backend)

- [ ] **AC-B01** `npm run pipeline:catalog` emits `data/catalog.json` in which **the count of courses with `id.affiliation === "PO"`, after every exclusion, is ≥ 1,900**; every course valid against `CourseSchema`; `courseKey` unique; `--from-csv` producing an equivalent file. Evidence: pasted run output with that exact count and the excluded-by-status counts.

  The predicate is pinned because "Active Pomona courses" had two defensible readings 82 apart — 2,087 emitted by `pipeline:catalog`, 2,005 carrying `affiliation: "PO"` in the finished catalog — and a floor of 2,000 made that ambiguity decide pass/fail (reviewer, 2026-09-11). **Count it this way and no other:**

  ```bash
  python3 -c "import json;print(sum(1 for c in json.load(open('data/catalog.json'))['courses'] if c['id']['affiliation']=='PO'))"
  ```

  The measured value today is **2,005**, so 1,900 is a truncation guard with 5% of headroom, which is its only job. It is not a quality bar: AC-B00's exclusion ceiling is what catches a filter that starts eating real courses.
- [ ] **AC-B01b** **Exclusion ceiling.** The number of records dropped by AC-B00's placeholder rules is reported, and the build **fails above 25**. Five are dropped today. This exists because the obvious implementation of AC-B00 is a substring match, and a substring match is measurably wrong here (see AC-B00). Evidence: the count in `catalog-excluded.md` and the guard's test.
- [ ] **AC-B02** The Registrar CSV parser handles UTF-16 LE with CRLF, pivots the Tableau long format, and yields 5,768 distinct courses with per-attribute counts matching the brief's table (Area 1 730, Area 2 931, Area 3 776, Area 4 334, Area 5 307, Area 6 292, WI 179, SI 177, AD 140, Language 251, PE 241). Evidence: unit test asserting these counts.
- [ ] **AC-B00** `data/catalog.json` contains no placeholder record. The rule is exact and **must not be loosened into a substring match**: drop a record when `id.department === "TEST"`, or when its `title` **begins with** `DNR:`; drop every `Banked` and `Inactive` Coursedog record. `data/reports/catalog-excluded.md` and `catalog-duplicates.md` list what was dropped and why (reviewer M-5, ADR-016).

  **Measured warning.** A `title contains "test"` filter deletes six real courses from the shipped catalog:

  ```
  ENGL 170R PO  Testamentary Fictions
  HIST 132  PO  Pol Protest & Soc Mov Latin Amer
  RLST 189N PO  Leadership, Authority, Protest
  RLST 061  SC  New Testament Christian Origins
  ENGL 076  PZ  American Protest Literatures
  CHST 055  CH  Digitizing our Testimonios
  ```

  Silently deleting a real course is a worse defect than shipping a placeholder, because a missing course makes the engine answer `unmet` for a requirement the student satisfied. **Five of those six carry GE attributes**, and `ENGL 170R PO` carries two:

  ```
  ENGL 170R PO  AREA_1 + WRITING_INTENSIVE     RLST 061  SC  AREA_3
  CHST 055  CH  AREA_3                         RLST 189N PO  AREA_3
  HIST 132  PO  AREA_3                         ENGL 076  PZ  (none)
  ```

  So the test asserts **attributes, not existence**: `ENGL 170R PO` must retain exactly `["AREA_1","WRITING_INTENSIVE"]`. A student who took it and nothing else for those slots would otherwise be told they still owe both an Area 1 and their Writing Intensive.

  **The one record that escapes the exact rule is handled by an exact-key denylist, never a pattern.** `THEA 007 PO` ("repeat test course") is Active upstream and carries no attributes, and every mechanical rule that would catch it destroys real data:

  | Candidate rule | What it deletes |
  |---|---|
  | `title contains "test"` | the six real courses above, five of them attribute carriers |
  | `department === "PREG"` | **13 real Associated Kyoto Program study-abroad courses** (`AKP 001-019 PO`), which are precisely the `provenance: abroad` courses the 16-credit residency requirement counts |

  So: maintain `data/catalog-denylist.json`, a list of **exact `courseKey` strings** each with a one-line reason, seeded with `THEA 007 PO`. It is human-curated and reviewed, it cannot over-match by construction, and adding to it is a visible diff. Anything else that looks like a placeholder is reported to `catalog-excluded.md` for the owner, never guessed at.

  Evidence: the reports, the exclusion count, the denylist, and tests asserting `ENGL 170R PO` keeps both attributes, the 13 `AKP` courses survive, and `THEA 007 PO` is gone.
- [ ] **AC-B03** Validators 1–8 in `docs/API.md` §4 exist, each with a unit test on a fixture, and the exclusion-anomaly report lists the 3 senior exercises with Area tags, the 10 non-Area-6 partial-credit tagged courses, and THEA085 PO. Evidence: `data/reports/exclusion-anomalies.md`.
- [ ] **AC-B04** `npm run pipeline:sections -- FA2026` emits ≥ 2,000 sections; every `geCodes` entry maps through `HYPERSCHEDULE_GE_CODES` or is reported. Evidence: run output.
- [ ] **AC-B05** `npm run pipeline:history -- FA2026` emits offering history for ≥ 1,400 courses with `knownTerms` ascending. Evidence: run output.
- [ ] **AC-B06** `npm run pipeline:manifest` writes a valid `Manifest` whose `upcomingTerms` all have sections files. Evidence: `scripts/contract-test.sh` exit 0.
- [ ] **AC-B07** `.github/workflows/pipeline.yml` runs nightly, runs `pipeline:all`, opens a PR on diff with the reports attached, and never pushes to `main`. Evidence: a PR opened by the workflow.
- [ ] **AC-B08** Hyperschedule and Coursedog are never called from `apps/web`. Evidence: `grep -r "hyperschedule\|coursedog" apps/web/src` finds only attribution text.

## Integration

- [ ] **AC-I01** `scripts/contract-test.sh` exits 0: `openapi.yaml` current, every artefact valid, every quote verbatim.
- [ ] **AC-I02** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all pass at the root. Evidence: pasted output.
- [ ] **AC-I03** `packages/shared` was not modified by any worker branch (`git log main..agent/* -- packages/shared` is empty) unless a `CONTRACT CHANGE REQUEST` was resolved by the manager with an ADR.
- [ ] **AC-I04** `engine` has no DOM or `Date.now()` reference and imports only `@gradguide/shared`. Evidence: `grep -rn "document\.\|window\.\|Date.now" packages/engine/src` is empty.

## Demo

- [ ] **AC-D01** Runs from a clean clone via `scripts/bootstrap.sh` then `npm run dev` with no manual steps.
- [ ] **AC-D02** Demo plans exist at `apps/web/public/demo/*.json` for fixtures F-01, F-02, F-03, F-04, F-05, F-06 and the README carries a share link for F-01.
- [ ] **AC-D03** A recorded fallback (GIF or video) of the primary demo flow exists in `docs/review/`.

---

## Engine fixtures (golden files)

Each fixture is a `StudentPlan` plus a small fixture catalog (≈ 40 hand-made
courses in `packages/engine/test/fixtures/catalog.fixture.json`, so tests never
depend on the nightly data) evaluated against the real
`data/programs/general-education-2026.json` and
`data/external-credit-rules.json`. The test asserts the **complete** `Result[]`
against a committed golden JSON. Determinism (`docs/API.md` §2.6) makes this
byte-stable.

| ID | Fixture | Must show |
|---|---|---|
| F-01 | Straightforward on-track student: 20 Pomona courses covering CI, five areas, WI, AD, one PE, every course carrying a term and a grade | those satisfied with courses named; Area 6, SI, Language unmet; PE partial (1 of 2); credits partial with correct remaining. **No GPA row exists** (ADR-015) |
| F-02 | Transfer student with pre-matriculation transfer courses tagged Area 2 and Area 3, 1 PE | `critical-inquiry` satisfied with `waived: true`; `physical-education` waived and `physical-education-transfer` satisfied; transfer Breadth counted; `post-matriculation-credits-transfer` applies |
| F-03 | AP and IB credit: AP Calculus AB 5 and BC 5 (duplicate), AP Biology 4, IB Chemistry HL 7, IB History SL 7, AP Spanish Language 5 | credit counted once for the calculus pair; IB SL earns 0 credit; advanced standing capped at 2 toward `total-credits`; Language satisfied by the AP exam with the `EXAM 000 EXT` pseudo-id and the exam named in the note |
| F-03b | Threshold boundaries: AP French 3 vs 4; IB Spanish B SL 7 vs HL 6; **IB Spanish A SL 7**; SAT-II Chinese 800; SAT-II French 650; A-Level Chinese A; A-Level German B | AP 3 not qualifying, AP 4 qualifying; IB B SL 7 **not** satisfying Language, IB B HL 6 satisfying; **IB A SL 7 satisfying Language with 0 credit**; SAT-II Chinese not satisfying (Romanized), SAT-II French satisfying with 0 credit; A-Level Chinese not satisfying Language (but earning credit under the unverified rule), A-Level German satisfying. A student with no language coursework and one qualifying exam ends `satisfied` |
| F-04 | Chair-granted substitution: an override on `speaking-intensive` with a course carrying no SI tag | `satisfied`, `viaOverride: true`, `satisfiedBy` = the override course, and that course not reused elsewhere unless overlap allows |
| F-05 | One course short: everything satisfied except Area 4, and **exactly 31.0 credits** | exactly one `unmet` with `remaining {1, courses}` and non-empty candidates; `total-credits` partial with `remaining {1, credits}`. The v0 fixture held 30.5 credits so the boundary it exists to prove was never exercised (reviewer M-1); the plan must total 31.0 |
| F-06 | **Assignment conflict:** `AMST 110 PO` carries Area 3 + Analyzing Difference, `HIST 101 PO` carries Area 3 only, and nothing else covers either | `area-3` <- `HIST 101 PO` and `analyzing-difference` <- `AMST 110 PO`, both `satisfied`, `HIST 101 PO` **used**. The test must assert the exact attribution, not just the two statuses, and must fail under the superseded "maximize unassigned" tie-break (reviewer M-2, ADR-013) |
| F-07 | A fixture major containing a `chooseN` rule and a `milestone` rule | both `unverifiable` with `note` naming the unsupported kind; nothing throws; the GE results are unaffected |
| F-08 | Fake major using only P0 rule kinds (`course`, `attribute`, `credits`, `gpa`) added as `packages/engine/test/fixtures/programs/fake-major.json` | evaluated correctly with no engine or app change (AC-P11) |
| F-09 | Distinct-departments conflict: DANC 051 PO (Area 1) and DANC 120 PO (Area 6) with no other Area 1 / Area 6 courses | one of the two areas `unmet` with `violations` or `note` naming the constraint; the other satisfied |
| F-10 | WI/SI single-course conflict: one course tagged both WI and SI, nothing else for either | one satisfied, the other `unmet`; never both satisfied by the same course |
| F-11 | PE distinct terms: two PE courses in the same term | `partial` 1 of 2 with a note about different semesters |
| F-12 | Empty plan, `studentType: firstYear` | every applicable requirement `unmet`; the two transfer-only requirements `satisfied` with `waived: true` (ADR-007 and API.md 2.4 - the v0 text said "every requirement unmet or unverifiable", which contradicted the engine that was right; reviewer D-09); candidates populated; nothing throws |
| F-13 | **Unknown terms and grades** (ADR-015): the same student as F-01 with every `term` and `grade` set to `null`, plus a variant with two PE courses whose terms are unknown | every attribute, area and overlay requirement returns the **same status as F-01**, proving term and grade are not needed for them; `physical-education` returns `unverifiable` with a note naming the two PE courses, because optimistic and pessimistic passes disagree; `total-credits` returns the same status as F-01 because the student has no external credit; `grade: null` counts as passed |
| F-14 | **`gpa` scope** (ADR-014): a fixture program with one `scope: "overall"` rule and one `scope: "program"` rule | `overall` evaluates; `program` returns `unverifiable` with the deferred-kind note. `packages/engine/test/fixtures/programs/fake-major.json` must use `scope: "overall"` only, so AC-P11 tests what it claims |

---

## Evidence required (protocol §22)

| Claim | Evidence |
|---|---|
| Frontend works | `docs/review/R-01-desktop-1440.png`, `R-02-tablet-768.png`, `R-03-mobile-390.png`, `R-04-what-satisfies.png` |
| States covered | `docs/review/R-NN-state-<empty\|loading\|error\|unverifiable\|override>.png` |
| Console clean | `docs/review/R-console.txt` |
| No student data leaves the browser | `docs/review/R-network.txt` |
| Tests pass | pasted `npm test` output |
| Contract matches | `scripts/contract-test.sh` output |
| Skills invoked | `scripts/audit-skills.sh` output |
