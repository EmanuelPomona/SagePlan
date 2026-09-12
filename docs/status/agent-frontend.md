# STATUS: agent/frontend
Task: TASK-020..025 and TASK-030..033 — all ten REVIEW
Round: 0 for TASK-030..033, round 1 for TASK-020..025
Last updated: 2026-09-11T18:40:00Z

## Skills invoked so far (most recent at the top)
- superpowers:requesting-code-review @ after round-2 verification -> 1 Critical,
  5 Important, 6 Minor findings, each with a reproduction.
- superpowers:receiving-code-review @ on those findings -> verified each against
  the code before fixing. Ten fixed, M-3 refuted in part (the "squashed" claim
  is about the department and number, which works and has a test), M-1 turned
  into a contract change request.
- superpowers:test-driven-development @ every review fix -> 25 new tests, each
  watched fail first. For M-4 I reverted each half of the fix separately to
  prove the new test discriminates.
- design-taste-frontend @ after the map was built, as the anti-generic critique
  TASK-033 requires -> three applicable hits, all applied: removed the filled
  progress track behind "N of M" (the dashboard tell), rewrote the administrative
  strip to read as sentences ("12.75 more course credits", not "12.75 to go
  course credits"), and stripped the leading count the figure already repeats.
  The skill declares itself out of scope for dense product UI in its own
  section 13, so only its anti-generic rules were applied. Em-dash audit run
  over the v1 UI strings: no hits in UI copy.
- superpowers:systematic-debugging @ the share-link defect the evidence pass
  surfaced -> found the real cause (same-document fragment navigation) instead
  of the "import is flaky" symptom.
- superpowers:test-driven-development @ the hashchange fix -> RED watched with
  exactly one failing case isolating the defect, then GREEN.
- superpowers:requesting-code-review @ after round-2 verification, before handoff
- superpowers:verification-before-completion @ round-0 blocked record -> forced
  mechanical proof of every claim; caught 3 sub-checks that silently failed on
  macOS (`cat -A` is GNU-only) and a skill listed as invoked when only preloaded.
- superpowers:test-driven-development @ before the first engine module -> set the
  test-first order for all 9 test files. Every module had a failing test first,
  and the RED was watched each time.
- superpowers:requesting-code-review @ after TASK-020 verification, before handoff
- superpowers:verification-before-completion @ immediately before claiming
  TASK-020 complete

## TASK-020 — packages/engine — COMPLETE
138 engine tests + 13 shared = 151 at root. Typecheck, lint clean.

Modules: context, resolvedCourse, filters, ordering, overlap, constraints,
assignment, manual, externalCredit, evaluate, and rules/ (course, attribute,
credits, gpa, attested, deferred, settlement).

### Three defects found by READING the goldens, not by the suite
The suite was green before all three. Each came from comparing the generated
goldens line by line against ACCEPTANCE.md's "Must show" column.

1. F-11 returned `unmet` instead of `partial` 1 of 2. The assignment tie-break
   preferred assigning NOTHING to a requirement it could not fully close, so a
   student with one PE course was told they owed two. Now scored
   satisfied -> progress -> courses spent. (798807a)
2. Every row of a 20-course plan carried "assignment search bounded". The search
   only short-circuited when EVERY requirement was satisfied, which never happens
   while Area 6 or Language is owed, so it burned its 10,000-node budget on
   ordinary plans. Now greedy constrained-first, backtracking only over
   requirements another assignment could actually close. (798807a)
3. Two exams granting different attributes shared one internal key, because both
   report as EXAM 000 EXT, so one grant could block another. (798807a)

Plus: a Breadth area blocked by the department rule came back unmet with NO
reason, because the search AVOIDS the clash and left nothing for the post-hoc
reporter to find. F-09 requires the row to name the constraint. (3068de8)

### Verified
- AC-P10 -> all 13 fixtures named in vitest output, F-01..F-12 including F-03b
- AC-P11 -> commit d3f0c0b adds the fake major touching 4 test files and ZERO
  source files; the engine was written and committed before the fixture existed
- AC-P15 (F-09), AC-P16 (F-03 + F-03b), F-06, F-07, F-10, F-11, F-12 -> golden
- AC-I03 -> git log base..HEAD -- packages/shared is empty; contract untouched
- AC-I04 -> grep for document./window./Date.now/Math.random in src is empty; no
  "dom" lib in tsconfig; engine imports only @gradguide/shared
- Determinism -> evaluate twice byte-identical; shuffled record identical
- Scope -> no source file outside packages/engine/ (package-lock.json changed,
  see the handoff: npm workspaces requires it to register the new package)

### Known issues carried into review
- The greedy pass is locally, not globally, optimal on courses spent: in F-01 it
  closes Area 1 with ARTH 051 and Writing Intensive with ENGL 010, where ENGL 067
  alone carries both. Every requirement still ends satisfied; only which course
  is NAMED differs. Backtracking does not run because nothing reachable is unmet.
- F-06 names AMST 110 on BOTH area-3 and analyzing-difference, since allowAll on
  both sides permits sharing. ACCEPTANCE's prose expects Area 3 to be named with
  HIST 101. Both end satisfied either way, and API.md 2.3 step 4 ("prefer the
  assignment that leaves the most courses unassigned") actually favours the
  shared answer. Raised for the manager rather than silently changed.

## TASK-021 — apps/web — COMPLETE
185 tests (engine 149, shared 13, web 23). Typecheck, lint clean. Build guard
proven: exit 1 with "Fixture data must never ship as the catalog."

Design pipeline ran in full before any UI code; direction and the palette
contrast defect are recorded above.

Browser QA found four defects that reading the code would not have:
"1 courses still needed"; the candidate count wrapping and destroying the dense
32px row; "1 more credits"; and the transfer-only PE requirement rendering as a
plain green "satisfied" to a first-year, which reads as "you have done PE".
Waived rows now say "not required" in plum and recede.

Evidence: docs/review/F-01..F-05 plus F-console.txt and F-network.txt
(68 requests, every one same-origin, fonts included).

### TASK-020 review response
Independent review returned "not ready to hand off": 2 Critical, 4 Important.
All reproduced as failing tests first, all fixed in 720becb. I was WRONG about
open item 5: I scoped the greedy assignment's local optimality as cosmetic from
the one fixture I had looked at, and the reviewer built a plan where it puts a
wrong number on a partial row. Contract change request filed for the gpa rule's
undefined .

## TASK-022 to TASK-025 — COMPLETE
283 tests (engine 149, shared 13, web 121). typecheck, lint clean. Build guard
still refuses to ship fixture data.

Record entry (ARIA combobox over a ranked index, spreadsheet paste with a
preview, non-catalog courses, exam entry that shows the verdict before it is
committed), the grouped audit with requirement detail, "What satisfies this?"
with the term ribbon, and export / import / share-link.

### Three defects browser QA found that the tests did not
1. The share-link import offer rendered in the FOOTER, 3400px below the fold.
   The link decoded perfectly and the student saw nothing. Moved to the top.
2. Every term ribbon was empty: the history hook guarded its fetch with a ref,
   which under StrictMode means pass one starts the fetch, cleanup cancels it,
   and pass two returns early having already been "started". Now a shared
   promise.
3. The section cache was per component, so ten open rows meant ten fetches of
   the same file. Now shared.

### Evidence
docs/review/F-01..F-09 plus F-console.txt (3 messages, zero errors) and
F-network.txt (98 requests, all same-origin, zero to hyperschedule.io, zero
POST). Share link measured at 638 characters; fragment cleared after import.

## TASK-030 to TASK-033 — COMPLETE (round 2)

TASK-030 engine round 2, TASK-031 theme/palette v1, TASK-032 record v1 and
transcript paste, TASK-033 the requirement map. All four REVIEW.

### The map, measured at a proven viewport (AC-V02, AC-V03)
The instrument is part of the claim: Chrome driven over CDP, viewport set with
`Emulation.setDeviceMetricsOverride`, never a window resize, with innerWidth and
innerHeight read back from inside the page. No chrome-devtools MCP this session
(it failed to connect), so the harness is a dependency-free Node script talking
CDP over Chrome's debugging socket.

    proof_innerWidth 1440   proof_innerHeight 800   dpr 2
    mapTop 277   mapBottom 551   mapHeight 274   fitsAboveFold TRUE
    nodeCount 12   collapsedRowHeights [38, 37]   recordSectionHeight 39
    fixtureBannerHeight 52 (dev only; absent in a production build)

All three headline targets met: the map closes at 551 against an 800 fold, its
height 274 is inside the 320 budget, and a collapsed row is 37-38px against the
40 budget, down from 57 in round 1.

### The state that does NOT fit above the fold
Arriving on a share link is a different state: it carries a 194px import
preview and an expanded record, which puts the map at mapTop 967, mapBottom
1240, fitsAboveFold FALSE. That is the transient first-visit-via-link state, not
the state the owner sees on every later visit. Recorded here rather than
quietly measuring only the flattering one.

### Responsive (measured, not eyeballed)
- 768x1024: mapTop 277, mapHeight 294, families fall into 2 rows (one full
  width at 672px, then two at 328px), horizontalOverflow FALSE.
- 390x844: layout viewport exactly 390 (the 412 defect from round 1 stays
  fixed), one column, minNodeTapDimension 60px so no node is under the 44px
  floor, nodesUnder44 = 0, horizontalOverflow FALSE.

### AC-P02, verified by doing it rather than by reading the code
Clicking the "Critical Inquiry" row: aria-expanded false -> true, a detail
panel appears headed "What the catalog says" carrying the verbatim sentence,
.quote count 8 -> 9. The 8 already on screen are the always-visible margin
sidenotes, which is the signature element, not expansion output.

## Defect found and fixed during the evidence pass
`useFragmentImport` read the fragment on mount only. Pasting a share link into
a tab that already had GradGuide open is a same-document navigation: nothing
reloads, nothing remounts, so the link did nothing at all and looked broken.
Reproduced at the CDP level (base URL, then the same URL plus fragment: the
import preview never appeared), fixed by also reading on `hashchange`. Accept
and dismiss clear the fragment with `replaceState`, which fires no hashchange,
so the offer cannot loop — that is pinned by a test.

## Round-2 code review — all findings addressed

C-1 (Critical): two sittings of one course defeated every overlap policy.
Reproduced, then fixed at the root -- `ResolvedCourse.repeatable` comes from the
catalog, and two rows are distinct sittings only for a repeatable course with
two recorded, differing terms. PE twice still counts twice; PHIL 032 twice does
not earn its flags twice.

I-1: the bounded double pass never reached `CourseFilter`, so the transfer
pre-matriculation rule ADR-018 exists for could not fire. Eligibility is now
recomputed inside each pass.

I-2: agreed status was printing optimistic numbers with no note. The row now
says "between 27 and 28 depending on when X was taken".

I-3, I-4, M-2: the transcript parser attributed a stale term after an unreadable
heading, rejected "Calculus II" as a bad grade, invented a grade from a title
word, and dropped unknown-campus lines in silence. All four fixed with tests,
including a test that ordinary furniture still stays silent.

I-5: a `distinctTerms` partial under-reported (latent on shipped data).

M-4, M-5, M-6: fixed, including a test of my own that proved nothing.

Tests: 383 (engine 194, shared 13, web 176). Typecheck and lint clean. Browser
re-measured after the engine changed: page unchanged for the demo plan, which is
the expected result.

## In progress
- [ ] Nothing. All ten frontend tasks are REVIEW, awaiting the reviewer.

## Blocked on
- nothing

## For the manager
- **CONTRACT CHANGE REQUEST (new):** the assignment ranking in `docs/API.md` 2.3
  and ADR-013 says *(satisfied, shared, courseKey)*; the engine implements
  *(satisfied, progress, shared)*. `progress` is what fixes F-11. The documents
  describe an engine that does not exist and should be amended, or I restore the
  documented rule and re-open F-11. Full request in HANDOFF-6.
- **A transfer student gets 11 map nodes, not 12.** TASK-033's parenthetical
  says the transfer case drops one node; it drops two, because
  `critical-inquiry` is waived for transfers as well. `families.test.ts` records
  the measured truth (11) rather than the number in the task text.
- `docs/tasks/INDEX.md` had accumulated duplicate rows and two `Counts:` lines
  from a union merge. `scripts/tasks.sh` regenerated it, which repaired it. The
  file is manager-owned but derived, and regenerating is what its own header
  says to do; flagging it because the repair rides in on my branch.
- The `--partial` progress-bar exception in DESIGN_BRIEF's justified-exceptions
  table is now partly moot: the only progress bar is gone. The exception permits
  rather than requires, so nothing is broken; worth a tidy at integration.
- CONTRACT CHANGE REQUEST: the gpa rule's `scope: "program"` is undefined in
  API.md. Interim behaviour is `unverifiable`. Full request in the handoff.
- F-06's fixture proves nothing, so the constrained-first guarantee that API.md
  2.3 makes its centrepiece currently has no test behind it. Needs an
  `exclusive` or `denyOnly` policy, which is a change to a manager-owned file.
- F-12's row in ACCEPTANCE is stale: it says every requirement is unmet or
  unverifiable, but API.md 2.4 requires the two non-applicable transfer
  requirements to be satisfied with `waived: true`, which is what the golden
  shows. Amend the fixture table, not the engine.
- `--partial` deviates from the brief: `#8C5C15` instead of `#B0731A`, which
  measures 3.48:1 on the cream canvas and fails AA for text.
- `scripts/slop-check.sh` defaults to `${1:-frontend}`, a directory the
  restructure deleted. A bare run prints "no such directory: frontend" and
  checks nothing, so it reports a false pass.

---

## TASK-021 design direction (produced by the 4-skill pipeline, before any UI code)

**Design read:** a dense single-page academic record for an anxious 19-year-old at
11pm before registration, in a document register, leaning on a hand-built row grid
rather than any component library.

Dials: VARIANCE 3 (the row grid is the design), MOTION 2 (one 180ms disclosure),
DENSITY 9 (the whole audit in one viewport at 1440).

`design-taste-frontend` declares itself out of scope for dense product UI and data
tables (its section 13), so only its anti-generic rules were applied. That is the
role the agent definition gives it: critique, not direction.

### The honest problem the pipeline surfaced

`frontend-design` names, as the two commonest tells of AI-generated design,
(1) a warm cream background near #F4F1EA with a high-contrast serif, and
(2) hairline rules with dense newspaper columns. The brief specifies both.

The skill's own rule is that the brief wins where it pins a direction, and
`DESIGN_CONSTRAINTS.md` section 2 already anticipates this exact trap. So the
palette and the rules stay. The consequence is that **none of the differentiation
can come from the surface**; all of it has to come from structure that only this
product could have: the margin of evidence, the term ribbon, and the four-verdict
row. Everywhere the brief leaves an axis free, it is spent away from the defaults.

### Five decisions, each against a default

1. **Verdict marks are inline SVG primitives, not Unicode glyphs.** U+25D0 and
   U+25CC are Geometric Shapes; coverage in IBM Plex is not guaranteed, and one
   missing glyph falls back to another font and breaks the row rhythm on exactly
   the row that matters most. Four primitives (filled, half, hollow, dotted ring)
   drawn at the mono cap height, each with the status word beside it and an
   aria-label. Never colour alone.
2. **No middle-dot meta chain in the masthead.** The brief's sketch reads
   "GradGuide · unofficial · Catalog 2026-27 · data as of 8 Sep"; the dot chain is
   a named tell and is rationed to one per line. The masthead becomes a colophon:
   name and the word unofficial on one line, then catalog year and data date as a
   labelled pair on the line beneath.
3. **Section headings are sentence-case serif, not tracked-out all-caps.**
   "Your record", "Your requirements". All-caps eyebrows above every section are
   the single most-violated anti-generic rule, and the brief's ASCII sketch is a
   layout diagram, not a typographic spec. The brief's binding content is the
   palette, the faces, the signature element, the density and the hierarchy.
4. **Requirements cluster on a change of RULE KIND, derived from the data.**
   One hairline between rows, a heavier rule where the kind changes, never two
   borders on one row. The first instinct was to hard-code the GE groups
   (Breadth, Overlays, Language and PE, Credits), but that would put a code path
   in the app that only general education uses, which `ARCHITECTURE.md` rule 1
   calls a design defect. Clustering on `rule.kind` produces the same four
   groups for GE and still works for a major nobody has encoded yet.
   NOT YET DONE: the brief also asks that unmet and partial sort to the top of
   their group. Rows currently render in program order. TASK-023 owns it.
5. **`partial` ochre is darkened from #B0731A to #8C5C15.** Measured 3.48:1 on the
   cream canvas, which fails WCAG AA for text; AC-F07 requires a pasted contrast
   check, so the brief's value cannot ship as written. #8C5C15 keeps the hue
   (35.6 degrees) and gives 5.06:1, which also puts all four verdicts in one
   5.0-5.6 band so they read as a system. **This is a deviation from a
   manager-owned document and is raised in the handoff rather than changed
   quietly.**

### Measured contrast of the brief's palette (light canvas #F5F0E6)

| role | hex | ratio | verdict |
|---|---|---|---|
| primary ink | #1E1C19 | 14.97 | pass |
| secondary | #6B665C | 5.02 | pass |
| satisfied | #2E6B3F | 5.62 | pass |
| partial | #B0731A | **3.48** | **fails AA, replaced with #8C5C15 at 5.06** |
| unmet | #A63D2F | 5.55 | pass |
| unverifiable | #4F5D75 | 5.86 | pass |
| override | #6E4A7E | 6.28 | pass |
| focus ring | #2F6FE4 | 4.10 | pass (3:1 non-text) |
| hairline | #D9D0BE | 1.35 | below 3:1, kept: a decorative divider, and faint rules are the point of the transcript reference. To be checked visually at 390px. |

Dark mode: every role passes on #1B1A17.

### Em dash audit
`DESIGN_CONSTRAINTS` item 8 covers interface strings only. The engine's
user-facing `note` strings and the GE program's labels and explanations are clean;
the only em dashes in the repository are in code comments and documentation, which
the constraint explicitly exempts.
