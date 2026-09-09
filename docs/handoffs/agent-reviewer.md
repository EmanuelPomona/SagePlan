# Handoffs — agent/reviewer

# REVIEW VERDICT: CHANGES_REQUIRED

Round: 1
Tasks reviewed: TASK-010, TASK-011, TASK-012, TASK-013, TASK-020, TASK-021, TASK-022, TASK-023, TASK-024, TASK-025
Reviewed at: http://localhost:3003 (vite dev, integrated worktree; `PREVIEW_URL` empty in `.env`)
Integrated commit: 63a19ee (agent/backend cc7fe2c + agent/frontend 1b5cdf8 merged into agent/reviewer)

## How this round started

**My branch's `docs/tasks/INDEX.md` was stale and said everything was READY.** Both
workers had in fact finished on their own branches and `scripts/integrate.sh` had
never run, so nothing was on `main` and nothing was visible from `agent/reviewer`.
Ground truth from `git show <branch>:docs/tasks/…`: frontend had TASK-020..025 in
REVIEW, backend had TASK-010..013 in REVIEW. I merged backend then frontend (the
order `integrate.sh` fixes: contract producer before consumer), regenerated the
one conflicted file (`package-lock.json`, per that script's own instruction never
to hand-merge it), and reviewed the integrated result rather than either branch.

**Integration itself is clean.** That is worth stating plainly before the findings:
572 tests pass, typecheck and lint are clean, the app builds, `contract-test.sh`
exits 0, and the privacy promise holds under my own measurement. The findings below
are mostly acceptance criteria that no longer match the data the project actually
found, plus one unresolved contract change. This is a strong round-1 submission.

---

## Critical

**None.** In particular the skill audit is clean: 27 invocations across three
worktrees, every `Skills Used` claim corroborated by the transcript, zero ghosts.

---

## High

### H-1 [PROTOCOL] — TASK-010 — a CONTRACT CHANGE REQUEST was never resolved, and the worker un-blocked itself
`docs/handoffs/agent-backend.md` opens with a well-argued CCR (the Coursedog
payload of 2,811 is 2,235 Active + 458 Banked + 118 Inactive, and the non-Active
rows are placeholders like `PE WAIVER`, `REG PENDING`, `TEST001 PO`). Protocol §6
was followed *inbound* and abandoned *outbound*. Verified from git history myself:

```
d162e78  backend: file CONTRACT CHANGE REQUEST for TASK-010, block on contract
           -status: READY        +status: BLOCKED
           -blocked_on: ""       +blocked_on: "contract"
fd5cc06  docs: handoff, status, task frontmatter for TASK-010..013
           -status: BLOCKED      +status: REVIEW      <-- same branch un-blocked itself
           -blocked_on: "contract" +blocked_on: ""
```

- `docs/ACCEPTANCE.md:55` still reads "≥ 2,700 courses" — never amended.
- `docs/DECISIONS.md` stops at ADR-010. No ADR records any of the four items.
- `docs/API.md:19` states the procedure: "The manager changes the schemas,
  regenerates, records an ADR." None of that happened.

The proposals are mostly technically right; that is not the issue. Only the manager
may resolve a CCR (§4, §6), and `AC-I03` explicitly conditions worker contract
changes on "a `CONTRACT CHANGE REQUEST` resolved by the manager with an ADR".
**Manager action, not backend action.**

*A second, separate CCR has the same defect:* `docs/handoffs/agent-frontend.md:347`
raises "CONTRACT CHANGE REQUEST — gpa rule scope" while
`docs/tasks/TASK-020-engine-evaluator.md` frontmatter still reads `status: REVIEW`,
`blocked_on: ""`. Disclosed in prose, not routed through the frontmatter §6 requires.

### H-2 [FUNCTIONAL] — TASK-010 — AC-B01's course threshold is not met by the command it names
`AC-B01`: "`npm run pipeline:catalog` emits `data/catalog.json` with ≥ 2,700
courses". My own counts:

```
data/catalog.json total ........ 2989
  by sourceUrl ................. {'coursedog': 2067, 'hyperschedule': 922}
  affiliation PO ............... 2005
data/reports/catalog-dropped.md . "2812 upstream record(s) -> 2087 course(s)"
```

`pipeline:catalog` alone yields **2,087**, not ≥2,700. The file only clears 2,700
because TASK-012 later merges 922 Hyperschedule courses into it. The shipped guard
is a floor of 2,000 on the Coursedog set (`packages/pipeline/src/commands/catalog.ts:38,82`)
— the figure from the unratified CCR. Reproduce: the python count above.
**Resolution is H-1's: restate the criterion per source, or the work goes back.**

### H-3 [FUNCTIONAL] — TASK-011 — AC-P09 requires zero unexplained divergences; all 282 are unexplained
```
data/reports/ge-divergences.md: 282 table rows, 282 with an empty Explanation cell
sample: | AMST 103 PO | Intro to American Cultures | — | AREA_3 | attribute sets differ | |
```
`AC-P09` asks for "zero unexplained divergences"; TASK-011's own derived AC only
asks for "a column the owner can fill in". Those two specs contradict each other and
the conflict is the manager's to settle. Either way 282 Coursedog-vs-Registrar
disagreements on Pomona courses need owner adjudication before this ships, because
`Course.attributes` is what every requirement verdict rests on.

### H-4 [FUNCTIONAL] — TASK-011 — AC-B03's exclusion-anomaly report does not contain what the AC specifies
`AC-B03` requires the report to list "the 3 senior exercises, the 10 non-Area-6
partial-credit courses and THEA085 PO". The shipped report says:

```
data/reports/exclusion-anomalies.md
  **10** anomaly/anomalies across 2989 catalog courses.
  - partial credit with a non-Area-6 Area tag: **5**     (AC says 10)
  - senior exercise (190–199) with an Area tag: **4**     (AC says 3)
  - two areas: **1**                                     (THEA 085 PO present, OK)
```
One mechanical cause is a real bug: `packages/pipeline/src/validators/exclusionAnomalies.ts:42`
tests `c.credits.max < 1`, so a course whose credits are 0.5–1 is skipped —
`GEOL 189V PO` (0.5–1, `AREA_4`) is therefore missing from the report.
Separately, the AC's own figures are not reproducible from any committed source:
against the registrar export I independently count **18** courses numbered 190–199
carrying an Area tag (**2** of them PO), not 3. The brief measured a different
population (its 2,811-course Coursedog catalog), so the AC's hardcoded counts need
re-measuring rather than the validator being bent to hit them.

### H-5 [FUNCTIONAL] — TASK-012 — AC-B04 requires both sections files; only one exists
```
data/sections-FA2026.json          present (2,160 sections)
data/sections-SP2027.json          ABSENT
data/manifest.json upcomingTerms   ['FA2026']
```
Upstream returned 404 for SP2027 and the backend disclosed this honestly. But
"What satisfies this?" is specified to offer an *upcoming* term filter, and with a
single-entry `upcomingTerms` the term filter degenerates to one option — the app
currently offers "Offered in FA 2026", a term that has already started relative to
the 2026-27 catalog. This is a product decision (wait for SP2027 to open, or ship
with FA2026 and say so), not a code defect.

### H-6 [FUNCTIONAL] — TASK-011 / TASK-002 — the Registrar's double-credit PE courses are silently collapsed, and the spec that describes them is wrong
This one produces a wrong answer for a real student, so it is the finding I would
fix first. Three documents disagree and I verified all three:

1. **The data.** `Measure Values` in the registrar export is **not** 0/1. My count:
   `{0: 27857, 1: 969, 2: 19}`. All 19 twos are `Physical Education`, and they are
   full-credit dance/PE courses — `DANC012 PPO`, `DANC050/051`, `DANC120/122/124`,
   `DANC150C PO`, `DANC175/176 PO`, `THEA053HG PO`, `MSL 099 CM`, `PE 077E/080 PO`.
2. **The spec is factually wrong.** `docs/tasks/TASK-011…md` "Upstream facts" states
   "`Measure Values` is `0`/`1`", and its test list says `Measure Values "0" rows add
   nothing`. Meanwhile `AC-B02` asserts `PE 241` — a number that only holds if 2
   counts as present. Under a literal `=== "1"` reading PE is **222**. The spec and
   its own acceptance criterion are mutually inconsistent.
3. **The implementation is right but undocumented.** `packages/pipeline/src/registrar/pivot.ts:66`
   is `if (row.measureValue >= 1)`, so 2 counts — which is why the AC-B02 test passes.
   No test or comment names the value-2 case, and the fixture contains only 0 and 1.
4. **The multiplicity is then discarded anyway.** The pivot yields a boolean
   `Set<GeAttribute>`, so `DANC 012` becomes "has PHYSICAL_EDUCATION" like any other
   PE course. The GE rule is
   `{kind:"attribute", attr:"PHYSICAL_EDUCATION", n:2, distinctTerms:true}`, and
   `distinctTerms` makes it structurally impossible for one course to close both
   halves. **Verified live in the browser:** the PE row reads "2 more courses / 0 of 2".

Net effect: a student whose PE requirement was closed by a single double-credit
dance course is told they still owe a PE course in another semester. The `attribute`
rule has a `unit: "courses" | "credits"` field but no way to express a per-course
attribute weight, so this needs a contract decision (§6), not a patch — and it needs
the Registrar to confirm what `2` means, which is exactly the kind of question
`confidence: draft` exists for.

---

## Medium

### M-1 [FUNCTIONAL] — TASK-020 — F-05's golden misses the boundary ACCEPTANCE names
`docs/ACCEPTANCE.md:96` specifies `total-credits` `remaining {1, credits}`; the
golden records `{"n": 1.5, "unit": "credits"}` (verified in
`packages/engine/test/golden/F-05.json`). The plan holds 30.5 credits, not 31, so the
"one credit short" case the fixture exists to prove is never exercised. The engine's
arithmetic is correct for the plan it was given.

### M-2 [FUNCTIONAL] — TASK-020 — F-06 contradicts ACCEPTANCE, and API.md §2.3 contradicts itself
`docs/ACCEPTANCE.md:97` requires constrained-first to assign "the rare course to AD
and the common one to Area 3". Verified in the golden:

```
area-3                <- ['AMST 110 PO']
analyzing-difference  <- ['AMST 110 PO']
HIST 101 PO used anywhere? False
```

The rare course is shared across both and the common course is unused. The root
cause is in the spec, not the engine: `docs/API.md` §2.3 step 4 says to "prefer the
one that leaves the **most** courses unassigned", which maximises sharing and so
produces exactly the outcome its own parenthetical rationale says to avoid. The
engine implements the rule as literally written. No graduation verdict is wrong
(both rows end `satisfied`, and sharing is legal under `allowAll`), but
`satisfiedBy` attribution is misleading and AC-P01 makes that attribution a headline
feature. **Manager decision on §2.3 step 4, then a fixture that actually
discriminates.**

### M-3 [FUNCTIONAL] — TASK-020 — a P0 rule kind returns `unverifiable`, so AC-P11 is not established
`gpa` is a P0 kind (`packages/shared/src/rule.ts:67`), yet verified in the golden:
`gpa -> satisfied` but `cs-gpa -> unverifiable`. This is the fail-safe behaviour of
the unresolved gpa-scope CCR (see H-1) and I agree it is the safe choice — returning
an overall average for a program-scoped rule would be worse. But AC-P11 should not be
ticked on F-08 as it stands.

### M-4 [FUNCTIONAL] — TASK-013 — `pipeline:all` cannot complete under its own documented default
`packages/pipeline/src/env.ts:41` and `.env.example:21` default
`PIPELINE_MAX_DIVERGENCES=25`, matching `docs/API.md:334` ("default 25"). With 282
divergences, validator 3 fails, `validate` exits 1, and the manifest is never
written. The committed `validation.json` reads `warn` only because the run used a
higher value, and `.github/workflows/pipeline.yml:42` hard-codes `"300"` — a value
the contract does not sanction (CCR item 4, unresolved). Argued from source: a live
run rewrites `data/`, which I would not do during review.

### M-5 [FUNCTIONAL] — TASK-010 / TASK-012 — placeholder records still reach the catalog
The Active filter is applied to Coursedog only; the Hyperschedule merge has no
equivalent. Verified in `data/catalog.json`:

```
TEST 001 PZ | Test Course-Disregard          TEST 001 SC | DNR: Add No Restrictions
TEST 002 PZ | Test Course--Disregard         TEST 002 SC | DNR: All Restrictions Cleared
TEST 003 SC | DNR: Unless Section is Closed  THEA 007 PO | repeat test course
```
Six records, and they are reachable from the course autocomplete — the exact outcome
the CCR's own rationale set out to prevent.

### M-6 [VISUAL] — TASK-021 — the brief's density requirement is not met at 1440px
`docs/DESIGN_BRIEF.md` states twice that "the entire audit … fits in one viewport at
1440px" and sets row height "about 32px". Measured at 1440×900 with the F-01 plan
loaded:

```
audit block height ... 1774px      viewport height ... 900px     fits: NO
sample row heights ... 57, 57, 32   (brief: ~32)
```
The audit is roughly two viewports tall, driven by ~57px rows. Advisory under
protocol §11 — reported, not blocking. Evidence: `docs/review/R-01-desktop-1440-full.png`.

### M-7 [VISUAL] — TASK-022 — at 390px, opening "Add an exam" widens the whole page
Measured at a true 390×844 mobile viewport (CDP emulation, dpr 2 — a macOS window
resize floors at ~500px and would have faked this):

```
before opening "Add an exam": layoutVW 390, scrollWidth 390
after  opening "Add an exam": layoutVW 595, scrollWidth 595, visualViewport 390
widest <select> ............. 541px
```
The exam `<select>` sizes to its longest option ("IB Mathematics (Analysis and
Approaches, or Applications and Interpretation)"), expanding the layout viewport by
53% and zooming the entire document out. The brief designs 390px for the
"outside the advisor's office, one thumb" moment, so this is the wrong place for it.
One-line fix: constrain `select { max-width: 100% }`.
Evidence: `docs/review/R-07-mobile-390-exam-select-DEFECT.png`.

### M-8 [VISUAL] — TASK-021 — every checkbox renders as a 13×32px dark block
`apps/web/src/styles/global.css:252` applies `min-height: 32px` (plus padding,
border, background) to `input, select, textarea, button` with **no checkbox
exemption anywhere in the stylesheet**, so native checkboxes are stretched to
13px × 32px. Compounding it, `global.css:9` sets a static `html { color-scheme:
light dark; }`, so when the OS prefers dark and the user picks the Light theme the
UA paints native controls in the dark scheme — a dark rectangle on cream. Affects
all 13 checkboxes (12 GE-attribute boxes + "Show all catalog candidates").

WCAG 2.2 AA 2.5.8 still **passes**: each box is wrapped in a `<label>` whose hit box
measures 77×40. This is a visual defect only. Suggested fix:
`input[type=checkbox] { min-height: auto; width: auto; }` plus
`html[data-theme="light"] { color-scheme: light }` / `[data-theme="dark"] { color-scheme: dark }`.

---

## Low

- **L-1 [PROTOCOL] — TASK-010..013 — the backend handoff is stale.** `16260e4`
  recorded the final verification; `cc7fe2c` then edited `write.ts`, the pagination
  loop, section-credit handling, three catch blocks, `data/catalog.json` and the
  reports. No HANDOFF-3, and the handoff's commit list omits `41c6acb` and `cc7fe2c`.
  Protocol §5: "A verification that is followed by more edits verified nothing."
- **L-2 — frontend runtime evidence predates integration.** `docs/review/F-network.txt`
  records a lazy fetch of `/data/sections-SP2027.json`; the integrated pipeline ships
  only `sections-FA2026.json`. The `F-*` evidence was captured against
  `apps/web/dev-fixtures/`, so it attests the app, not the integrated result. My `R-*`
  set covers the integrated result. (Its substance is corroborated — see below.)
- **L-3 — README's demo share link hard-codes port 3001.** `bootstrap.sh` assigns a
  port per worktree (mine was 3003), so the documented link 404s anywhere but the
  frontend worktree. Suggest `$FRONTEND_PORT` or a relative `#plan=…` instruction.
- **L-4 — `validate-artefacts.ts` under-reports its own coverage.** `checkQuote`
  pushes an outcome only on failure, so the summary reads "6 check(s), 0 failed"
  while 34 quote checks actually ran. As the artifact ACCEPTANCE cites for AC-P02,
  the number understates the evidence.
- **L-5 — `scripts/slop-check.sh` defaults to a `frontend/` directory that does not
  exist** in this layout (the app is `apps/web`), so the reviewer's own mechanical
  check errors out unless a path is passed. Suggest defaulting to `apps packages`.
- **L-6 — handoff figures drift from the artefacts:** "2,087 Pomona courses" vs 2,005
  PO / 2,067 Coursedog-sourced; sections 2,159 vs 2,160.
- **L-7 — `geCodes.ts:8-13` allowlists `1DDP` and `1P1…1P10` on a wrong comment**
  ("these subdivide 1PE"); 122 FA2026 sections carry a `1P*` code with no `1PE`. No
  GE attribute is lost, but AC-B04's "or is reported" clause is unsatisfied and the
  reported "0 unrecognised Pomona code(s)" is an artefact of the allowlist.
- **L-8 — `docs/ACCEPTANCE.md:103` (F-12) conflicts with ADR-007** on waived rows.
  The engine follows ADR-007/API.md, which are authoritative; reconcile the doc.
- **L-9 — F-03b's golden does not actually assert the ADR-007 correction.** With the
  IB Language A grant neutralised the golden is byte-identical, because five exams in
  that plan qualify for Language. The corrected rule *is* implemented and unit-tested
  (`test/externalCredit.test.ts:45`), but the golden ACCEPTANCE cites for AC-P16 does
  not carry that clause.
- **L-10 — `parseCsv.ts:62`** coerces a garbled `Measure Values` to 0 ("overlay
  absent") with no count. No live impact; only 0/1/2 occur.

---

## Evidence Produced

All under `docs/review/`, captured by me against the integrated tree. Viewports are
real CDP `Emulation.setDeviceMetricsOverride` values, verified by reading back
`innerWidth` — not window resizes.

```
R-01-desktop-1440.png                    1440x900   audit + expanded requirement detail
R-01-desktop-1440-full.png               1440x3979  whole page (density evidence, M-6)
R-02-tablet-768.png                       768x1024  evidence margin collapses below the row
R-03-mobile-390.png                       390x844   mobile audit
R-03-mobile-390-full.png                  390x4000  whole mobile page
R-04-state-empty.png                     1440x900   empty state, localStorage verified empty
R-05-state-error.png                     1440x900   /data/manifest.json blocked
R-06-state-loading.png                   1440x900   catalog.json held open via Fetch domain
R-07-mobile-390-exam-select-DEFECT.png    780x1688  M-7, the 541px select at 390px
R-console.txt                                       full console, primary flow
R-network.txt                                       AC-P07 network audit (mine, not copied)
```

## Skill Audit

`scripts/audit-skills.sh` on all three worktrees. **27 invocations, every claim
corroborated, zero ghosts.** Timing complies with protocol §18 — the frontend's four
design skills land at 32–35% of the session (before major UI) and
`make-interfaces-feel-better` at 92% (polish after structure).

| Worktree | Claimed | Invoked | Ghosts | Exit |
|---|---|---|---|---|
| main (manager) | 6 | 6 | 0 | 0 |
| agent/frontend | 12 | 14 | 0 | 0 |
| agent/backend | 6 | 7 | 0 | 0 |

## Verification Performed

| Claim | Evidence |
|---|---|
| Integration merges cleanly | 63a19ee; only `package-lock.json` conflicted, regenerated |
| Typecheck / lint / build | `npm run typecheck` rc=0, `npm run lint` rc=0, `npm run build` rc=0 |
| Tests | `npm test` rc=0 — **572 passing** (engine 149, pipeline 289, shared 13, web 121) |
| Contract | `scripts/contract-test.sh` **exit 0**, "6 check(s), 0 failed", CONTRACT OK |
| Manager's 7 claimed commands | all re-run independently, all exit codes match |
| Every `sourceQuote` verbatim | my own checker: **34/34 byte-exact** (18 req + 1 constraint + 7 advisories + 8 external). Stronger than claimed — no normalisation needed |
| TASK-002 shape | 18 requirements, 7 advisories, 1 `distinctDepartments`, `draft` on exactly the 3 named ids |
| TASK-001 contract | 46 registry schemas == 46 openapi schemas, names identical, zero drift |
| Registrar export | re-measured: 28,845 rows, 5,768 courses, 1,785 PO, 13 campuses, one two-Area course, `Measure Values {0:27857,1:969,2:19}` |
| **AC-P07 privacy (by me)** | 96 HTTP requests, **one host** (own origin), **all GET/200**, only `?v=` params, **0** query strings with plan data, CSP `connect-src 'self'` + `form-action 'none'`, fragment cleared by `replaceState` |
| Console clean | 0 app errors / warnings / exceptions, incl. the error path |
| Share link | F-01 link imported through a real page load: preview with counts, explicit warning, Cancel; accepted → 20 courses, 5 of 6 breadth areas (matches README) |
| Requirement detail | verbatim quote + plain-English rule + `draft` disclosure + override form, expanding in place |
| "What satisfies this?" | "108 of 190 courses … offered in FA 2026", term ribbon SP23→FA26, instructor, seats, Hyperschedule link |
| Failure states | error names the exact file and adds "Your own record is safe: it is stored in this browser"; loading shows "Loading the catalog." |
| Keyboard focus | 3 real Tab presses → `:focus-visible` matches, `solid 2px rgb(111,160,255)` offset 2px = the brief's token |
| Contrast (dark) | satisfied 7.85:1, partial 8.0:1, unmet 5.81:1, secondary 6.45:1 — all > AA 4.5:1 |
| Status not colour-only | glyph is `<svg aria-hidden="true">` beside a real text word |
| Touch targets | checkbox 13×32 but its wrapping `<label>` is 77×40 → WCAG 2.5.8 passes |
| Polish | reduced-motion present, no `transition: all`, `tabular-nums`, font smoothing, `text-wrap: balance/pretty` |
| Design constraints | `slop-check.sh apps/web` → 1 hit, `box-shadow: var(--shadow-popover)`, which the brief's "Justified exceptions" names exactly. No pure white, no Inter/Geist, no gradient, no glassmorphism, no emoji icons, **no Pomona blue** |
| Secrets | no credentials in the diff; `.env` gitignored; the 4.7MB registrar export is **course data only** (Course Number, Title, Breadth Area, Measure Names/Values, Language) — **no student PII** |
| Brief signature elements | margin of evidence and term ribbon both implemented, and the margin genuinely re-flows below the row at 768 |

### Hypotheses I killed rather than filed
Recorded because a reviewer's false findings cost as much as missed ones:
`REGISTRAR_GE_LABELS` "missing" COMMUNITY_PARTNERSHIP (the export has no such
label; all 11 keys occur); the 314/3 senior-exercise counts "wrong" (the brief
measures a different population); checkboxes "unlabelled" (implicit `<label>`
wrapping is spec-valid); status glyphs "missing" (`aria-hidden` SVG, not text);
focus ring "absent" (programmatic `.focus()` was the wrong instrument); the
popover shadow (justified in the brief); the share link "not importing" (a
hash-only navigation does not remount).

## What Was NOT Verified

- **AC-B07 end to end.** `git remote -v` is empty and neither `actionlint` nor `act`
  is installed. The nightly workflow has never executed and no PR can exist. The YAML
  parses and matches the checklist.
- **No live pipeline run.** `pipeline:*` all write into `data/`, so I verified the
  committed artefacts and the source, not the runs. M-4's exit-1 behaviour and
  AC-P08's 401 path are argued from source.
- **AC-D02's "the reviewer can import each through the UI".** I imported F-01 via the
  README share link and verified the offer/confirm/replaceState path. I did not drive
  the file picker for all six demo plans — this is why TASK-025 is not approved.
- **AC-P07's private-window clause.** A fragment is not transmitted by construction
  and my same-origin result holds, but I did not record a separate private session.
- **Production build's network profile.** Reviewed against the vite dev server;
  `npm run build` succeeds but `dist/` was not served and re-measured.
- **The `unverifiable` row's dashed border** (brief requirement). The F-01 plan has
  letter grades, so no row was `unverifiable`; I saw the state in the empty view but
  did not measure its border.
- **Whether `Measure Values = 2` really means "worth two PE courses"** (H-6). Needs
  the Registrar. Both readings are defensible from the file alone.
- **Whether the ~20 non-PO records overwritten by the sections merge lost GE
  attributes.** Needs the raw Coursedog payload, which is not committed.
- **Dark/light theme parity by screenshot.** Contrast was measured on the dark canvas
  only; the light palette was read from tokens, not measured per element.
- **Engine caps at their boundaries:** `externalCredits` (16),
  `partialCreditCourses` (8), `partialCreditCourseCredits` (2) — no fixture reaches
  them. Also untested end to end: attestations (`viaAttestation`) and
  `provenance: "abroad"`, both of which AC-P05 depends on.

## Disposition

| Task | Verdict | Why |
|---|---|---|
| TASK-010 | CHANGES_REQUIRED | H-1, H-2, M-5 |
| TASK-011 | CHANGES_REQUIRED | H-3, H-4, H-6 |
| TASK-012 | CHANGES_REQUIRED | H-5, M-5, L-7 |
| TASK-013 | CHANGES_REQUIRED | M-4; AC-B07 unverifiable |
| TASK-020 | CHANGES_REQUIRED | M-1, M-2, M-3 + the unrouted gpa CCR |
| TASK-021 | APPROVED | no blocking finding; M-6, M-8 advisory → `docs/DEBT.md` |
| TASK-022 | APPROVED | no blocking finding; M-7 advisory → `docs/DEBT.md` |
| TASK-023 | APPROVED | requirement detail, override and attestation paths verified live |
| TASK-024 | APPROVED | candidates, term filter and term ribbon verified live |
| TASK-025 | CHANGES_REQUIRED | AC-D02's six-plan UI import unverified (evidence gap, not a defect) |

**Most of the High findings are the manager's, not the workers'.** H-1 through H-5 are
acceptance criteria and contracts that no longer match what the data turned out to
be, and the workers largely found and disclosed those mismatches themselves. The
fastest route through round 2 is for the manager to resolve the two CCRs with ADRs
and restate AC-B01, AC-B03, AC-P09 and API.md §2.3 step 4 against measured reality.
H-6 is the one finding that changes an answer a student would see.

## Skills Used

| Skill | Stage invoked | What it actually changed |
|---|---|---|
| `ecc:contract-first` | before the contract review | Gave me the "duplicate sources of truth" test, which drove the zod ↔ openapi ↔ API.md drift check (46 == 46, no drift) and stopped me filing API.md §1's deliberate deferral to the zod source as drift |
| `ecc:security-review` | before the privacy/secrets stage | Scoped the audit correctly (no server, DB or auth here, so most of its checklist is N/A) onto secrets and sensitive-data exposure; drove the registrar-CSV PII check and the AC-P07 network measurement |
| `ecc:browser-qa` | before runtime QA | Its phase order and its "no baseline ⇒ INCONCLUSIVE, never a silent PASS" rule; made me capture states and console rather than eyeball screenshots |
| `frontend-design:frontend-design` | before the visual review | Its AI-slop cluster (cream + serif + hairlines + mono labels) *is* this design's surface, so it forced me to test each pattern against DESIGN_BRIEF instead of flagging on sight — every one turned out to be named and justified there |
| `ui-ux-pro-max:ui-ux-pro-max` | before the a11y/interaction review | WCAG 2.2 AA 2.5.8 (24 CSS px, web) — measured the label hit box at 77×40 and correctly downgraded M-8 from an accessibility failure to visual-only |
| `ecc:make-interfaces-feel-better` | before the polish pass | Its checklist, run against the stylesheet, found the app already does reduced-motion, `tabular-nums`, no `transition: all`, `focus-visible`, font smoothing and `text-wrap`; the one gap it exposed was the unstyled native checkbox (M-8) |
| `superpowers:verification-before-completion` | immediately before this verdict | Its "verify agent reports independently" rule made me re-derive every subagent finding myself — the catalog counts, the 282 empty explanations, the 4/5 anomaly split, F-05's `{1.5}`, F-06's shared `AMST 110 PO`, F-08's `cs-gpa`, the divergence defaults and the six placeholder records |

Not invoked, and why: `ecc:e2e-testing` (the frontend's 121 web tests plus my
browser pass covered the flows; no E2E harness exists to run), `ecc:accessibility`
(`ui-ux-pro-max` supplied the WCAG 2.2 rule I needed), and
`superpowers:systematic-debugging` (I diagnosed but fixed nothing — that skill
belongs to whoever fixes H-6).

## Commit

`agent/reviewer` — see below.
