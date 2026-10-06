---
id: TASK-020
title: Requirement engine — P0 rule kinds, constrained-first assignment, external credit, golden fixtures
status: READY
owner: frontend
branch: agent/frontend
priority: HIGH
round: 1
depends_on: []
blocked_on: ""
---

# TASK-020 — Requirement engine (`packages/engine`)

## Objective

Implement `@sageplan/engine` exactly as specified in `docs/API.md` §2: a pure,
deterministic `evaluate(plan, programs, catalog): Result[]` and
`resolveExternalCredit(input, rules): ExternalCredit`, with golden-file tests for
fixtures F-01 to F-12 in `docs/ACCEPTANCE.md`. **Start this task first**; it
depends only on `packages/shared`, which exists.

This is where the product's correctness risk lives. A wrong `satisfied` is the
worst failure mode (brief §6). TDD is mandatory for every module here.

## Scope

Create only:

```
packages/engine/package.json                 name @sageplan/engine, type module, "main"/"types"/"exports" -> ./src/index.ts, dependency @sageplan/shared, scripts test (vitest run) and typecheck (tsc -p tsconfig.json)
packages/engine/tsconfig.json                extends ../../tsconfig.base.json; NO "dom" in lib
packages/engine/src/index.ts                 export { evaluate } from "./evaluate.ts"; export { resolveExternalCredit } from "./externalCredit.ts"; export { EXAM_PSEUDO_ID } ...
packages/engine/src/context.ts               buildContext(plan, catalog): EvalContext  (resolved courses, externalCredits, matriculationTerm, studentType, catalog index by courseKey)
packages/engine/src/resolvedCourse.ts        type ResolvedCourse = { completed: CompletedCourse; key: string; credits: number; attributes: GeAttribute[]; inCatalog: boolean; passing: boolean; letterPoints: number | null }
packages/engine/src/filters.ts               courseMatchesFilter(c: ResolvedCourse, filter: CourseFilter | undefined, ctx): boolean   (API.md §2.2 filter table, ANDed)
packages/engine/src/rules/course.ts          eligibleCourses(rule, ctx) / settle(rule, assigned, ctx)
packages/engine/src/rules/attribute.ts       eligibleCourses (incl. granted-attribute pseudo entries) / settle (unit courses|credits, distinctTerms, remaining, candidates)
packages/engine/src/rules/credits.ts         settle: sum with filter, includeExternal default, caps (API.md §2.4), remaining
packages/engine/src/rules/gpa.ts             settle: weighted by credits over pomona|claremont|abroad letter grades; unverifiable when none
packages/engine/src/rules/attested.ts        settle from plan.attestations[rule.id]
packages/engine/src/rules/deferred.ts        settle -> unverifiable, note `rule kind '<kind>' not yet supported`
packages/engine/src/overlap.ts               mayShare(a: Requirement, b: Requirement): boolean   (both policies must allow)
packages/engine/src/constraints.ts           violations(program, assignment, ctx): Map<requirementId, string[]>   (distinctDepartments)
packages/engine/src/assignment.ts            assignCourses(reqs, eligible: Map<reqId, ResolvedCourse[]>, program, ctx): Assignment   (constrained-first, bounded backtracking, tie-break = most courses left unassigned)
packages/engine/src/manual.ts                applyWaiver / applyOverride / applyAttestation -> Result overrides
packages/engine/src/externalCredit.ts        resolveExternalCredit(input, rules); countExternalCredits(credits: ExternalCredit[], caps): { advancedStanding: number; notes: string[] }   (one per duplicateKey, then caps)
packages/engine/src/ordering.ts              byCourseKey(a, b); sortIds(ids: CourseId[]): CourseId[]
packages/engine/src/evaluate.ts              evaluate(plan, programs, catalog): Result[]   orchestrates: context -> per program: waivers, eligibility, assignment, settle each rule, manual results, constraints, confidence copy, ordering
packages/engine/test/fixtures/catalog.fixture.json          ≈40 hand-made courses (see below)
packages/engine/test/fixtures/programs/fake-major.json      F-08: only P0 rule kinds
packages/engine/test/fixtures/programs/deferred-major.json  F-07: chooseN + milestone
packages/engine/test/fixtures/plans/F-01.json … F-12.json  one StudentPlan each (F-03b included)
packages/engine/test/golden/F-01.json … F-12.json          expected Result[] (generated once, reviewed by hand, committed)
packages/engine/test/golden.test.ts                        for each plan fixture: evaluate against data/programs/general-education-2026.json (+ fixture programs where the fixture says so) and deep-equal the golden; `UPDATE_GOLDEN=1` rewrites (never in CI)
packages/engine/test/assignment.test.ts                    F-06: a naive greedy implemented IN THE TEST fails; assignCourses passes. Also: exclusive policy, denyOnly WI/SI (F-10), distinctDepartments (F-09)
packages/engine/test/externalCredit.test.ts                F-03b thresholds as table-driven unit tests
packages/engine/test/filters.test.ts, rules/*.test.ts       unit tests per module
```

Do not modify `packages/shared`. If the contract cannot express something,
file a `## CONTRACT CHANGE REQUEST` (protocol §6) with the failing fixture.

## Interfaces

**Consumes:** every type and schema in `@sageplan/shared`; `GRADE_POINTS`,
`gradePoints`, `isPassing`, `gradeAtLeast`, `compareTerms`, `sameCourse`,
`sameTerm`, `courseKey`, `HYPERSCHEDULE_GE_CODES` is not needed here.
Data: `data/programs/general-education-2026.json`, `data/external-credit-rules.json`.

**Produces** (TASK-022 to TASK-025 rely on these exact names):

```ts
export function evaluate(plan: StudentPlan, programs: Program[], catalog: Course[]): Result[];
export function resolveExternalCredit(input: ExternalCreditInput, rules: ExternalCreditRules): ExternalCredit;
export const EXAM_PSEUDO_ID: CourseId; // { department: "EXAM", courseNumber: 0, suffix: "", affiliation: "EXT" }
```

`Result[]` is ordered program → requirement; `satisfiedBy` and `candidates`
sorted by `courseKey`; same inputs give byte-identical output (API.md §2.6).
A granted external-credit attribute appears in `satisfiedBy` as
`EXAM_PSEUDO_ID` and the exam's `label` in `note`.

## The fixture catalog (author it by hand, ~40 courses, all `catalogYear 2026-2027`)

Include at least: `ID 001 PO` (no attributes, 1 credit); two courses per Area
1–5 from distinct departments; `DANC 051 PO` (AREA_1), `DANC 120 PO` (AREA_6,
0.5 credit), `THEA 001 PO` (AREA_6, 1 credit), `MUS 060 PO` (AREA_6 0.25);
`HIST 101 PO` (AREA_3 only); `AMST 110 PO` (AREA_3 + ANALYZING_DIFFERENCE);
`ENGL 067 PO` (AREA_1 + WRITING_INTENSIVE); `RHET 010 PO` (SPEAKING_INTENSIVE);
`PHIL 032 PO` (AREA_3 + WRITING_INTENSIVE + SPEAKING_INTENSIVE) for F-10;
`SPAN 033 PO` (LANGUAGE); `SPAN 001 PO` (no attributes); `PE 001 PO`,
`PE 002 PO` (PHYSICAL_EDUCATION, 0.25); `PSYC 052 SC` (AREA_2) to prove
Claremont courses count; `GEOL 112 PO` (no attributes); `CSCI 195 PO`
(no attributes, senior exercise). Realistic titles.

## Tests to write first (in this order; commit after each green step)

1. `filters.test.ts`: provenance filter; `transferPolicy` lets a pre-matriculation transfer course through only for `studentType: transfer`; `sinceMatriculation`; `partialCredit: exclude`; `attributes` requires all.
2. `rules/attribute.test.ts`: n=1 satisfied/unmet; `unit: credits` sums 0.5 + 0.5; `distinctTerms` blocks two same-term PE; granted LANGUAGE from an `ExternalCredit` satisfies with `EXAM_PSEUDO_ID`; `candidates` excludes completed and already-assigned courses and is sorted.
3. `rules/credits.test.ts`: default includes external when no filter; filter present → external excluded unless `includeExternal: true`; duplicateKey counted once; `advancedStandingCredits` cap 2; `externalCredits` cap 16 across transfer + exams; partial-credit caps 2 credits / 8 courses; `remaining` correct.
4. `rules/gpa.test.ts`: A + C = 3.0 weighted by credits; CR ignored; transfer ignored; no letter grades → `unverifiable`.
5. `externalCredit.test.ts`: the F-03b table (AP 3/4, IB B SL 7 / HL 6, IB A SL 7, SAT-II Chinese 800, SAT-II French 650, A-Level Chinese A, A-Level German B, unknown subject).
6. `assignment.test.ts`: F-06 greedy-fails/constrained-passes; F-09; F-10; exclusive.
7. `golden.test.ts`: generate goldens with `UPDATE_GOLDEN=1`, **read every golden by hand against ACCEPTANCE.md's "Must show" column**, then commit. A golden you did not read is not a test.

## Acceptance Criteria

- [ ] AC-P10: `npx vitest run --root packages/engine` passes with F-01…F-12 each named in the output (paste it).
- [ ] AC-P11 / F-08: `fake-major.json` evaluates correctly with zero changes outside `test/fixtures`; `git diff --stat` of that commit proves it.
- [ ] AC-P15 / F-09, AC-P16 / F-03 + F-03b, F-06, F-07, F-10, F-11, F-12 as specified in `docs/ACCEPTANCE.md`.
- [ ] AC-I04: `grep -rn "document\.\|window\.\|Date.now\|Math.random" packages/engine/src` is empty; `packages/engine/tsconfig.json` has no `dom` lib.
- [ ] Determinism: a test evaluates F-01 twice and asserts `JSON.stringify` equality; another shuffles `plan.completed` and asserts identical output.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass at root.
- [ ] No file outside `packages/engine/`, `docs/status/agent-frontend.md`, `docs/handoffs/agent-frontend.md` and this task file is modified.

## Notes

- Skills: `superpowers:test-driven-development` before every module (this task is the protocol §14 case), `superpowers:systematic-debugging` for any failing golden you do not immediately understand, `superpowers:requesting-code-review`, `superpowers:verification-before-completion`. The frontend design pipeline is NOT required for this task (no UI).
- Assignment search bound: depth = number of course-selecting requirements; abort backtracking after 10,000 node visits and return the best assignment found with a `note` on affected results ("assignment search bounded"). At P0 scale it never triggers; the bound exists so a pathological plan cannot hang the browser.
- Waived requirements are excluded from assignment (their courses stay free).
- An `Override` course is removed from the pool for other requirements unless the overridden requirement's policy allows sharing.
- `Result.confidence` = `requirement.confidence ?? program.confidence`.
- Commit the goldens compact but readable (2-space JSON). They will be diffed in review.

## Review History

| Round | Verdict | Summary |
|---|---|---|
| 1 | CHANGES_REQUIRED | M-1 F-05 golden {1.5} vs ACCEPTANCE {1}; M-2 F-06 shares AMST 110 PO, API.md 2.3 step 4 self-contradictory; M-3 cs-gpa unverifiable so AC-P11 unproven; gpa CCR not routed via frontmatter. |
