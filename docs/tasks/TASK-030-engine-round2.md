---
id: TASK-030
title: Engine round 2 — assignment attribution, gpa scope, optional terms and grades, bounded evaluation
status: REVIEW
owner: frontend
branch: agent/frontend
priority: HIGH
round: 0
depends_on: [TASK-020]
blocked_on: ""
---

# TASK-030 — Engine round 2

## Objective

Close the engine findings from review round 1 and implement the contract
changes the manager made on 2026-09-11. Do this **before any UI work**: the map
in TASK-033 prints `satisfiedBy` under every node, so wrong attribution becomes
the most prominent text on the page.

Four changes, all specified in `docs/API.md` and `docs/DECISIONS.md`:

1. **Assignment tie-break (ADR-013, reviewer M-2).** `docs/API.md` 2.3 step 4 is
   rewritten: maximize requirements satisfied, then **minimize sharing**, then
   deterministic by `courseKey`. The old rule maximised sharing and credited
   `AMST 110 PO` to both Area 3 and Analyzing Difference while `HIST 101 PO`
   went unused.
2. **`gpa` scope (ADR-014).** Your contract change request is accepted as
   proposal 1: `scope: "overall"` as specified, `scope: "program"` deferred to
   P1 returning `unverifiable`. The behaviour you already shipped is the
   permanent behaviour — no code change to `gpa.ts` is expected. `courseSet` is
   **not** being added. Move `fake-major.json` to `scope: "overall"` so AC-P11
   tests what it claims, and add F-14 for the deferred path.
3. **Optional terms and grades (ADR-015).** `CompletedCourse.term`, `.grade`,
   `.gradeMode` and `StudentPlan.matriculationTerm` are now nullable in
   `@gradguide/shared`. `grade: null` means **passed**.
4. **Bounded evaluation under unknowns (`docs/API.md` 2.7).** Any rule whose
   answer depends on a field that is `null` for a relevant course is evaluated
   optimistically and pessimistically; equal statuses return that status,
   different statuses return `unverifiable` with a note naming the missing field
   and the affected courses.

Also fix **M-1**: F-05's plan holds 30.5 credits, so the "one credit short"
boundary it exists to prove is never exercised. Make it total exactly 31.0.

## Scope

```
packages/engine/src/assignment.ts     rank assignments per ADR-013
packages/engine/src/context.ts        tolerate null term/grade/gradeMode; infer matriculationTerm as the earliest known course term; expose `unknowns` (which courses lack term / grade)
packages/engine/src/resolvedCourse.ts passing = isPassing(grade) with null treated as passing
packages/engine/src/filters.ts        minTerm / sinceMatriculation / transferPolicy become three-valued: true | false | unknown
packages/engine/src/rules/attribute.ts distinctTerms three-valued when a term is null
packages/engine/src/bounded.ts        NEW. settleBounded(settleFn, ctx): runs the optimistic and pessimistic passes and reconciles them per API.md 2.7
packages/engine/src/evaluate.ts       route course-selecting and aggregate rules through settleBounded when ctx.unknowns is non-empty; short-circuit (single pass) when it is empty
packages/engine/test/fixtures/plans/F-05.json    adjust to exactly 31.0 credits
packages/engine/test/fixtures/plans/F-13*.json   NEW (two variants: F-01 with all terms/grades null; two PE courses with unknown terms)
packages/engine/test/fixtures/programs/fake-major.json   scope: "overall"
packages/engine/test/fixtures/programs/gpa-scopes.json   NEW, for F-14
packages/engine/test/golden/*.json    regenerate; F-01 and F-12 lose their gpa row because the GE program no longer has one
packages/engine/test/bounded.test.ts  NEW
```

Do not touch `packages/shared` (it is already changed) or `apps/web`.

## Interfaces

**Consumes:** the updated `@gradguide/shared` — `CompletedCourse.term: TermId | null`,
`.grade: string | null`, `.gradeMode: GradeMode | null`,
`StudentPlan.matriculationTerm: TermId | null`.

**Produces:** unchanged public API (`evaluate`, `resolveExternalCredit`,
`EXAM_PSEUDO_ID`). `Result.note` gains the missing-field sentences.

## Tests to write first

1. `assignment.test.ts` — **write this one so it fails under the old rule.** With `AMST 110 PO` (Area 3 + AD) and `HIST 101 PO` (Area 3 only): assert `area-3 <- HIST 101 PO` and `analyzing-difference <- AMST 110 PO` by exact `satisfiedBy`, and assert `HIST 101 PO` is used. Then assert that an assignment ranked by the superseded rule would not satisfy the assertion (a comment is not enough — implement the old ranking in the test as a local function and assert it produces the wrong attribution).
2. **`bounded.test.ts` must be falsifiable.** A golden that records only the cases where the two passes agree cannot distinguish a working implementation from one that never runs the pessimistic pass, and the failure mode this whole mechanism exists to prevent — silently assuming in the student's favour — is exactly the one such a golden hides. So, as with F-06's tie-break: **neutralise the pessimistic pass inside the test** (stub it to return the optimistic result) and assert the outcome changes. If it does not change, the mechanism is vestigial and the test is decoration. The reviewer will apply this technique independently; it is cheaper to build it in.
   Then the cases: two PE courses, terms null: `unverifiable` with both course keys in the note. The same two with distinct terms: `satisfied`. A student with no external credit and every term null: `total-credits` and `post-matriculation-credits` return the same status as with terms present. A student **with** AP credit and every term null: `post-matriculation-credits` is `unverifiable`.
3. `grades.test.ts` — `grade: null` counts as passed; `grade: "F"` does not; `grade: "IP"` does not.
4. `golden.test.ts` — F-13 asserts every area, overlay and language status equals F-01's.

## Acceptance Criteria

- [ ] F-06 asserts exact attribution and fails under the superseded tie-break (ADR-013, AC in `docs/ACCEPTANCE.md`).
- [ ] F-05 totals exactly 31.0 credits and its golden shows `remaining {1, credits}` (reviewer M-1).
- [ ] F-13 and F-14 exist and pass as specified in `docs/ACCEPTANCE.md`.
- [ ] `fake-major.json` uses `scope: "overall"`; AC-P11 re-established.
- [ ] Every golden regenerated and **read by hand** against ACCEPTANCE's "Must show" column before committing. Say in the handoff that you read them.
- [ ] AC-I04 still holds: no DOM, no `Date.now()`, no `Math.random()` in `packages/engine/src`.
- [ ] Determinism tests still pass, including the shuffled-input test.
- [ ] `npm run typecheck`, `lint`, `test` pass at root.

## Notes

- Skills: `superpowers:systematic-debugging` before touching the assignment ranking (it is the subtlest code in the project), `superpowers:test-driven-development` for every module here, `superpowers:requesting-code-review`, `superpowers:verification-before-completion`.
- Performance: bounded evaluation doubles the work only when something is unknown. Short-circuit to a single pass when `ctx.unknowns` is empty, and say in the handoff what the evaluation time is for a 32-course plan in both cases.
- **Also close reviewer finding L-9 while you are in the fixtures:** F-03b is specified in `docs/ACCEPTANCE.md` to assert the ADR-007 correction — that an **IB Language A exam at Standard Level with a 6 or 7 satisfies the language requirement while earning no credit** — but the fixture as built does not contain such an entry, so the correction is untested. The brief said "IB SL never qualifies"; the catalog says that is true for credit and false for Language A, and that distinction is currently resting on nothing.
- Your round-1 CCR is resolved in ADR-014 — read it before starting; the manager accepted your proposal 1 and rejected proposal 2, with reasons.

## Review History

| Round | Verdict | Summary |
|---|---|---|
