# STATUS: agent/frontend
Task: TASK-020 COMPLETE (pending review) — next TASK-021
Round: 0
Last updated: 2026-09-08T20:57:51Z

## Skills invoked so far
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

## In progress
- [ ] TASK-021 web app shell. Not started. NOTE: data/catalog.json does not exist
      yet (backend TASK-010), so there is no catalog for the app to load; the
      data-unavailable state is itself one of the states TASK-021 must build.

## Blocked on
- nothing

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
4. **Requirements are grouped into four clusters, not eighteen identical ruled
   rows.** Breadth (the six areas), Overlays (WI, SI, AD), Language and PE, then
   Credits and GPA. One divider between clusters, one hairline between rows, never
   both borders on the same row. This also serves the brief's stated hierarchy:
   unmet and partial sort to the top of their cluster.
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
