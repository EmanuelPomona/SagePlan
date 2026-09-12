# STATUS: main
Task: v1 planning + live rulings. TASK-030..033 dispatched; backend round 2 closed.
Round: n/a (manager)
Last updated: 2026-09-11T18:40:00Z

## Skills invoked so far
- (2026-09-08 planning) brainstorming, ecc:product-lens, ecc:contract-first, superpowers:writing-plans, ecc:architecture-decision-records, superpowers:verification-before-completion
- ecc:architecture-decision-records @ ADR-011..021 -> the v1 decisions and every live ruling since
- superpowers:verification-before-completion @ before each commit -> five gates re-run with explicit exit codes

## Done — v1 planning (2026-09-11)
- [x] Owner feedback re-scoped: map not overlays, no grades/terms, GPA out, transcript paste, light default, quotes on expand
- [x] ADR-011..015 written; packages/shared widened (term/grade/gradeMode/matriculationTerm nullable); GE gpa moved to advisories (17 reqs, 8 advisories)
- [x] DESIGN_BRIEF v1 revision (map, 3 families, node grammar, measurable density targets); ACCEPTANCE AC-V01..V11; PRODUCT v1 table
- [x] TASK-030..033 written and dispatched to the three sessions directly (owner granted permission)

## Done — rulings made live, each on a measured challenge
- [x] ADR-014 gpa scope CCR (frontend) — proposal 1 accepted, courseSet rejected
- [x] ADR-016 backend CCR — Active-only, most-complete dedupe, divergence threshold 300; + exact-key denylist, entry-is-not-retention
- [x] ADR-017 criteria must name predicate + instrument (AC-B01 pinned, AC-P09 by shape, AC-V02 at 1440x800 CDP); amended: goldens must discriminate
- [x] ADR-018 pessimistic pass may only consider POSSIBLE values — resolved the 2.7 contradiction the frontend measured on F-13
- [x] ADR-019 round counter -> docs/review/rounds.md; integrate.sh now merges agent/reviewer LAST (evidence + DEBT were stranded too)
- [x] ADR-020 round-2 rulings: entry!=retention, attributeWeights deferred, AC-B03 population, AC-B04 SP2027 unpublished, AC-B07 no remote
- [x] AC-B03 predicate ruled credits.min (my ADR-020 had silently reverted reviewer H-4)

## Verified (evidence, not assertion)
- typecheck 0, lint 0, shared 13/13, openapi --check current, validate-artefacts 0 failed (rc 2 by design) — re-run before every commit
- substring "test" filter deletes 6 real courses, 5 carrying GE attributes -> AC-B00 asserts attributes, not existence
- department PREG holds 13 real AKP study-abroad courses -> denylist, never a pattern
- all 13 AKP carry attributes: [] and provenance is plan-side -> my "breaks residency" claim was WRONG, corrected
- L-9's actual text says the GOLDEN cannot discriminate; 5 LANGUAGE granters, ib-spanish-a credits 0 -> L-9 RIGHT, my paraphrase inverted it
- no Area rule carries partialCredit: exclude -> the tag is load-bearing -> credits.min
- git remote -v EMPTY; Hyperschedule /v4/term/all has no SP2027 -> AC-B07 and H-5 are not backend defects
- backend's exclusion report: 9 anomalies, population stated, GEOL 189V PO counted (read on agent/backend)
- frontend 049f55d: F-13 golden 17 rows, ZERO unverifiable; F-13c exists

## My own errors this session, for the retro
1. API.md 2.3 step 4 contradicted its own rationale (reviewer M-2) — maximised sharing, misattributed satisfiedBy
2. API.md 2.7's two sentences disagreed (frontend CCR) — the ADR-015 default record produced the row ADR-015 existed to delete
3. AC-B01 counted 576 administrative placeholders; AC-B03 hardcoded a different population's figures; AC-B04 required an unpublished term
4. Claimed a PREG filter "breaks the residency requirement" — it does not; my own output disproved it and I read past it
5. Relayed L-9 as a paraphrase that inverted it, then treated the refutation of my paraphrase as refuting the finding
6. Wrote to reviewer-owned DEBT.md from main, causing the first conflict; ledgers are now merge=union
7. Dispatched workers before giving the reviewer the criteria to challenge (ADR-017's stated lesson)

## In progress
- [ ] frontend: TASK-033 (the map) + F-03c; reviewer: gating TASK-030 alone; backend: done, awaiting gate

## Blocked on
- nothing for planning.

## Owner actions outstanding
1. Create a git remote and push — D-11/AC-B07 cannot close, and nothing is backed up off this machine
2. Drop a real transcript at data/sources/samples/ (gitignored) to unblock ADR-012's PDF tier
3. Name a successor in README before any public launch
4. Registrar questions: what Measure Values = 2 means (D-12); the GE divergence shapes; the 3 draft-confidence requirements

## Owed, not done
- main still has NEITHER worker merged. Integration must happen in a FRESH session (Mode B), and its first step is now: check every handoff for an open CONTRACT CHANGE REQUEST.
