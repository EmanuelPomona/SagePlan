# Product Specification — SagePlan

Source: `PROJECT_BRIEF.md` (project owner, 2026-09-08), decomposed by the manager.
Every figure below was measured against a live source on 2026-09-08 by the owner.

## Product Name

**SagePlan** (repository `SagePlan`; called Pomona GradGuide until 2026-10, see ADR-025).
Always described as *unofficial*. It never uses the College's seal, wordmark, or
brand blue, so no student can mistake it for a Registrar system.

## One-Sentence Description

An unofficial, browser-local web app that tells a Pomona College student which
graduation and general-education requirements they have satisfied, which remain,
and which specific courses, actually offered in an upcoming term, would close the
gaps.

---

## Product Diagnostic (product-lens, Mode 1)

### 1. Who is this for?

A Pomona first- or second-year, the week before registration, with the Portal,
Hyperschedule and a private spreadsheet open in three tabs, trying to decide
which of four candidate courses to take. Secondary: any Pomona student asking
"does this one course do double duty?" before adding it.

Not for: advisors, the Registrar, other 5C students (their GE rules differ),
graduate programs.

### 2. What is the pain?

- Degree progress is tracked by hand. The spreadsheet is tedious to build, easy to
  get wrong, and says nothing about what to take next.
- The catalog states the rules but does not apply them to *you*; the schedule
  lists offerings but knows nothing about your requirements. Nothing connects the
  two.
- Scarcity makes planning real: only **140** Analyzing Difference and **177**
  Speaking Intensive courses exist across all five colleges, not all run every
  term. Missing one is discovered senior year.
- Frequency: every registration period, twice a year, for four years.

### 3. Why now?

- The official replacement audit (Anthology Student, replacing Jenzabar CX) is
  **paused** after the vendor was sold. Nothing new surfaces in Pathify. The
  window for a student-built planning tool is wider than expected.
- The data finally exists in machine-readable form: the Coursedog catalog API
  (2,811 courses, 85% with GE attributes), Hyperschedule v4 (per-term sections
  and a **per-course offering history back to ~2012** that no official tool
  exposes), and a Registrar GE export for cross-checking.
- The Registrar has already applied GE eligibility exclusions when tagging
  courses, so the engine needs no exclusion heuristics: measured 0 of 50
  lower-division language courses and 3 of 314 senior exercises carry an Area
  tag.

### 4. The 10-star version

Every Pomona major and minor encoded; a four-year planner that sequences courses
by when they actually run; what-if comparison between majors; catalog-year
switching; a contribution path so departments can maintain their own encodings.
Everything still browser-local.

### 5. The MVP (P0)

General education only, zero majors. Ships for 100% of Pomona students with no
per-program encoding, and tests the riskiest assumption first: will students use
an unofficial tool at all?

### 6. Anti-goals

See "Explicitly Out of Scope" below. The single most important one: **no
server, no accounts, no database.** Student academic data never leaves the
browser.

### 7. How do we know it is working?

No telemetry can be added without violating the privacy rule, so the metric is
behavioral and opt-in:

- **P0 launch gate (mechanical):** all eleven acceptance criteria in
  `docs/ACCEPTANCE.md` pass with evidence.
- **P0 usage signal (owner-collected):** during the next registration period, at
  least a handful of students the owner does not personally recruit produce a
  "What satisfies this?" shortlist and report acting on it. Collected by a
  feedback link, never by tracking.
- **Trust signal:** zero reports of a requirement shown as `satisfied` that the
  Registrar's audit shows as unmet. One such report is a P0-blocking defect.

**Go / no-go:** GO. The pain is recurring and quantified, the data is available
today, the competitor is stalled, and the MVP is small enough that a solo owner
can maintain it.

---

## Problem

Tracking degree progress at Pomona is manual and disconnected from planning.
Students maintain private spreadsheets that are tedious to build, easy to get
wrong, and useless for looking ahead. The catalog and the course schedule are two
systems that never meet.

## Target User

Pomona undergraduates, primarily first- and second-years choosing courses during
registration, and anyone deciding whether a prospective course does double duty.

## Core User Story

As a Pomona student,
I want to see exactly which general-education requirements I still owe and which
currently-offered courses would satisfy them,
so that I can register with confidence instead of reverse-engineering the catalog
every semester.

---

## MVP Goal

P0 must let a student:

1. **Enter completed courses quickly**, with autocomplete against the real
   catalog and paste-from-spreadsheet, plus AP/IB/A-Level and transfer credit.
2. **See every graduation and GE requirement resolve automatically**, with the
   specific course that satisfied each one named and the catalog's verbatim
   sentence beside it.
3. **For any unmet requirement, see candidate courses** filtered to those
   actually offered in an upcoming term, flagged when a candidate would also
   close a second requirement, with each course's offering history visible.
4. **Persist, export and re-import their data entirely in the browser**, and
   share a plan by link without the plan ever touching a server.

---

## Primary Demo Flow

1. Open the app cold. The empty state already shows the full GE structure with
   real course counts per requirement ("Area 5: 307 courses across the 5Cs"),
   the catalog year, and the "data as of" stamp.
2. Set profile: matriculation term FA2025, first-year student.
3. Enter ten completed courses. Type `CSCI 5` and pick `CSCI 051 PO` from
   autocomplete; paste six rows copied from a spreadsheet; add `AP Spanish
   Language, score 5`.
4. The dashboard resolves: Areas 1, 2, 4, 5 satisfied (each naming the course),
   Language satisfied by the AP exam (flagged as an exam), PE 1 of 2 (partial),
   Area 3, Area 6, Speaking Intensive, Analyzing Difference unmet.
5. Open Analyzing Difference. The requirement detail shows the catalog's verbatim
   sentence in the margin, the rule as plain English, and "What satisfies this?"
6. The shortlist shows only courses offered in SP2027, each with its offering
   history ribbon; one is marked "also closes Area 3".
7. Record a chair-granted substitution as an override for Speaking Intensive. It
   renders as an override, visibly distinct from an automatic match.
8. Export the plan as JSON. Hard-reload. The plan is still there. Copy the share
   link, open it in a private window: identical plan, and the network tab shows
   no request carried it.

---

## v1 scope change (owner feedback, 2026-09-11)

The P0 build shipped and was reviewed against real use. v1 does not add
capability; it removes friction and makes the answer visible.

| Change | Reason | Where |
|---|---|---|
| A requirement map above the detail rows | "Scroll down to see area requirements" - the audit measured 1774px at 1440x900 | ADR-011 |
| The app never asks for grades, terms, or where a course was taken | These served one requirement the owner removed; the rest are inferable | ADR-015 |
| GPA leaves the audit and becomes a quoted advisory | Most students are in good standing, and share links would carry grades to whoever received them | ADR-015 |
| Paste a transcript blob; PDF once a sample exists | "People don't wanna search up every class" | ADR-012 |
| Light default, family hues, quotes on expand | Owner direction; density | ADR-011 |

Still out of scope, and explicitly not taken from the owner's reference image:
the four-year planner, prerequisite graphs, "Unlocks", and the major tree. Those
remain P1 (majors) and P2 (planner).

## Interface Shape (owner decision, 2026-09-08)

**One page. No tabs, no routes, no separate landing page.** Course entry, the
progress dashboard, each requirement's detail, "What satisfies this?", and
export/import all live on a single scrolling page and open in place. A student
never navigates away from their own audit. The browser back button never has
anything to do.

## Must-Have Features (P0)

- [ ] Course entry with catalog autocomplete and spreadsheet paste
- [ ] Student profile: matriculation term, first-year vs transfer
- [ ] External credit entry: AP, IB (HL/SL), A-Level, transfer, resolved against
      `data/external-credit-rules.json` with caps and duplicate detection
- [ ] Requirement engine: `course`, `attribute`, `credits`, `gpa`, `attested`
      rules; overlap policy; constrained-first assignment with bounded
      backtracking; overrides; attestations; deferred rule kinds return
      `unverifiable`
- [ ] Single-page layout: every screen in the brief is a section or an inline
      disclosure on one page, no router
- [ ] Progress dashboard with four visually distinct states and no overall
      percentage
- [ ] Requirement detail with verbatim `sourceQuote`, satisfying course, override
      and attestation controls
- [ ] "What satisfies this?" filtered to an upcoming term, dual-purpose marking,
      offering-history ribbon
- [ ] localStorage persistence, JSON export/import, URL-fragment share link
- [ ] `catalogYear` stamp, "data as of" stamp, staleness banner after one catalog
      year, specific disclaimer linking to the official audit, Hyperschedule
      attribution
- [ ] Nightly data pipeline: Coursedog courses, Hyperschedule sections and
      offering history, validators, provenance stamping, loud failure
- [ ] GE program encoded as data with verbatim source quotes
- [ ] Golden-file engine tests for the fixture set in `docs/ACCEPTANCE.md`
- [ ] Proof that a new program is a JSON file only (fake-major fixture)

## Nice-to-Have Features

Only after every must-have passes review.

- [ ] Advisory prerequisite note rendered from `prereqText` on candidate courses
- [ ] "Typically offered" inference (e.g. "every fall since 2018") from offering
      history
- [ ] Print stylesheet for the dashboard (students bring it to advising)
- [ ] Keyboard shortcuts for course entry

---

## Explicitly Out of Scope

Do not build during P0. Cite this section when rejecting scope drift.

| Not building | Why |
|---|---|
| A server, user accounts, or login | Nothing in P0 needs one; storing other students' records creates FERPA exposure for zero capability gain |
| Any database | The whole catalog is a few MB of JSON; ship it as static files |
| SIS / transcript integration | Requires formal agreements with ITS and the Registrar |
| A weekly schedule / timetable builder | Hyperschedule does this; link to it |
| Scraping the 5C registrar | Hyperschedule has done it for nine years; consume their API in CI |
| Major and minor auditing | Deferred to P1, but the architecture must not preclude it (see `docs/ARCHITECTURE.md`) |
| Hard prerequisite enforcement | Only 5% of courses have structured prerequisites; advisory only |
| Analytics or telemetry of any kind | Could reconstruct academic records; forbidden |
| Calling Hyperschedule or Coursedog from the browser | Obligation to the maintainers; fetch in CI and serve our own copy |

---

## Success Criteria

P0 is successful if:

- the primary demo flow above completes end to end from a clean clone
- all eleven criteria in `docs/ACCEPTANCE.md` pass with evidence
- no network request carries student data (browser network tab)
- the nightly pipeline runs green and fails loudly on 401 or empty results
- adding a fake major requires only a new JSON file

---

## Constraints

| Constraint | Value |
|---|---|
| Team | Solo project owner (a Pomona student) plus this agent fleet |
| Hosting | Any static host; no runtime server, no ops |
| Required stack | React + TypeScript + Vite; pure-function engine; TypeScript pipeline on GitHub Actions |
| Required data sources | Coursedog catalog API (needs `Origin: https://catalog.pomona.edu`), Hyperschedule v4, Registrar GE export (committed at `data/sources/`) |
| Privacy | Student data in `localStorage` only; share links carry the plan in the URL fragment |
| Launch preconditions | Courtesy note to the Registrar; email to Hyperschedule maintainers; re-verify Anthology status; succession section in README |
| Maintenance horizon | Owner graduates; staleness banner and succession plan are P0 requirements |

## Roadmap Beyond P0

| Phase | Scope | Gate |
|---|---|---|
| P1 | 3 to 5 majors hand-encoded (start with the 24 structured programs; add Computer Science as the hard case). Implement `allOf`, `anyOf`, `chooseN`, `fromSet`, `milestone` | P0 is actually used |
| P2 | Semester planner; "typically offered" inference; advisory prerequisite warnings | P1 engine proven |
| P3 | Remaining majors and minors via a contribution path; what-if comparison; catalog-year switching | Coverage becomes a community problem |
