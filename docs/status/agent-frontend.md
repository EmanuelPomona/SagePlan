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
