# Handoffs — agent/frontend

## HANDOFF-1 — agent/frontend — 2026-09-08

### Summary

No frontend work was performed, and none should have been. The repository is an
unpopulated template: `docs/tasks/` holds zero tasks, and `docs/DESIGN_BRIEF.md`,
`docs/PRODUCT.md`, and `docs/ARCHITECTURE.md` are all unedited scaffolds. Status
is BLOCKED pending manager input.

This handoff exists to make the blocker visible outside the session and to state
exactly what input unblocks it, so the manager can resolve it in one pass.

### Tasks Completed

None. No task in `docs/tasks/` carries `owner: frontend`; the only file matching
that string is `TASK-000-template.md`, the template itself (`status: BACKLOG`).
`bash scripts/tasks.sh` reports 0 tasks.

### Files Changed

- `docs/status/agent-frontend.md` — blocked-state record with evidence
- `docs/handoffs/agent-frontend.md` — this file
`scripts/tasks.sh` was run and regenerated `docs/tasks/INDEX.md` to byte-identical
content, so it is not in the commit. No task file was created: `docs/tasks/*.md` is
manager-owned under protocol section 3.

No files under `frontend/` were created. See "Why nothing was scaffolded" below.

### Contracts

None produced or consumed. `docs/API.md` currently defines exactly one endpoint,
`GET /api/health` -> `{"status":"ok"}`, so there is no product data contract for
a client to integrate against.

### Skills Used

| Skill | Stage invoked | What it actually changed |
|---|---|---|
| `superpowers:verification-before-completion` | Before committing the blocked record | Forced a fresh proving command per claim. Caught three sub-checks that had silently failed on macOS (`cat -A` is GNU-only) and which I had already written up as verified; they were re-run portably before assertion. Also caught that I had listed `using-superpowers` as invoked when it was only preloaded by the SessionStart hook, and that claim was removed. |

The four mandatory design skills (`ecc:frontend-design-direction`,
`frontend-design:frontend-design`, `ui-ux-pro-max:ui-ux-pro-max`,
`design-taste-frontend`) were deliberately NOT invoked. Protocol section 18 places
them immediately before major UI implementation. There is no UI to implement and
no brief to ground them in. Running them now would consume the stage and let a
later handoff cite a "design direction" that was never derived from a product.
They run when the brief is concrete.

### Verification

| Claim | Command | Result |
|---|---|---|
| On the right branch | `git rev-parse --abbrev-ref HEAD` | `agent/frontend` |
| No task assigned | `bash scripts/tasks.sh` | `docs/tasks/INDEX.md regenerated — 0 task(s)` |
| Brief has no reference points | `sed -n '/## Reference points/,/## Desired character/p' docs/DESIGN_BRIEF.md \| grep -E '^[0-9]\.'` | lines 6-8 are bare `1.` `2.` `3.` |
| Brief has no type pairing | `grep -nE '^(Display face\|Text face\|Why these)' docs/DESIGN_BRIEF.md` | lines 40-42, all empty after the colon |
| Brief has no palette | `grep -E '^\| (canvas\|primary text\|accent / action) \|'` | all rows empty: `\| canvas \| \| \|` |
| Brief has no signature element / anti-character | section body extraction | template prose only |
| Product undefined | `sed -n '/## Product Name/,/## One-Sentence/p' docs/PRODUCT.md` | `TBD` |
| No frontend stack chosen | `grep -nE '^(Framework\|Language\|Styling\|State Management):' docs/ARCHITECTURE.md` | all six fields empty |
| API surface | `grep -cE '^### (GET\|POST\|...)' docs/API.md` | `1` (`GET /api/health`) |
| No app exists | `find frontend -type f` | `frontend/.gitkeep` |

### What Was NOT Verified

- **Nothing was run in a browser.** No dev server was started, no screenshots
  captured, no console log collected. `docs/review/` contains no `F-*` artifacts
  from this session. There is no application to load, so the browser-QA gate in
  the frontend role definition was not attempted rather than attempted and failed.
- **`scripts/bootstrap.sh` was not executed.** `.env` already exists with
  `FRONTEND_PORT=3001` / `BACKEND_PORT=8001`, but I did not confirm those ports
  are free or that bootstrap succeeds from a clean clone.
- **`scripts/slop-check.sh` was not run.** It inspects implementation source;
  there is none.
- **No typecheck, lint, build, or test** was run. No toolchain exists yet.
- **I did not verify the manager's intent.** The repository name suggests a
  Pomona College graduation-guide product, but a repository name is not a brief
  and I did not treat it as one.

### Known Issues

Four distinct blockers, listed with what each one gates:

1. **`blocked_on: brief`** — `docs/DESIGN_BRIEF.md` is empty. Gates the entire
   design pipeline. The frontend role definition requires named reference points,
   a type pairing with a reason, a semantic palette, a signature element, and an
   anti-character before design work begins. `docs/DESIGN_CONSTRAINTS.md` section
   2 makes the same point from the other side: a ban list constrains where a
   design cannot go but does not aim it, and avoiding the twenty-two tropes while
   matching nothing in the brief is still a failure.
2. **`blocked_on: task`** — zero tasks exist. Nothing defines scope or acceptance
   criteria for this branch.
3. **`blocked_on: architecture`** — no frontend framework, language, styling
   approach, or state approach is chosen, so even scaffolding is blocked. The
   manager owns stack selection under protocol section 4; choosing here would
   silently set a contract other agents consume. Note `.env` carries
   `VITE_API_BASE_URL`, which hints at Vite, but that is template boilerplate and
   `docs/ARCHITECTURE.md` is the authoritative file. `docs/ARCHITECTURE.md` also
   still has an empty "frontend-engineer" row in its Model Assignment table.
4. **`blocked_on: product`** — protocol section 7 requires real product content.
   `PRODUCT.md` supplies no product name, MVP goal, demo flow, or feature list, so
   anything built now would be placeholder-filled by construction.

**Why nothing was scaffolded.** The protocol's blocked procedure says to continue
with unaffected work. I looked for some and concluded there is none: scaffolding
requires a framework decision I do not own, and building UI requires a brief and a
product. Creating a Next.js app when the manager intends Vite is not neutral
groundwork; it is an architecture decision made by default, which is the thing
section 4 exists to prevent.

**Minimum input to unblock, in dependency order:**

1. `docs/PRODUCT.md` — product, target user, MVP goal, primary demo flow
2. `docs/ARCHITECTURE.md` — frontend framework, language, styling, state; plus the
   frontend-engineer model/effort row
3. `docs/DESIGN_BRIEF.md` — all five required fields, concretely
4. `docs/API.md` + `docs/openapi.yaml` — the endpoints the client consumes
5. A task file with `owner: frontend`, `status: READY`, and acceptance criteria

Items 1-3 unblock design and scaffolding. Item 4 can arrive later if the first
task is presentational; it blocks data integration only.

### Commit

See the commit that adds this file.

---

## HANDOFF-2 — agent/frontend — 2026-09-08

### Summary

`packages/engine` (`@gradguide/engine`) is complete: a pure, deterministic
requirement evaluator with 138 tests and 13 committed golden fixtures. The
round-0 blockers are gone (the manager landed the plan in 5c3d4e8), so this
supersedes HANDOFF-1's BLOCKED state.

The engine is where this project's correctness risk lives, and the most useful
thing in this handoff is the list of defects that a green test suite did not
catch. Three of the four were found by reading the generated goldens line by
line against `docs/ACCEPTANCE.md`'s "Must show" column.

### Tasks Completed

**TASK-020** — Requirement engine. Acceptance criteria satisfied:

- **AC-P10** golden tests pass for the whole fixture set; all 13 fixtures are
  named in the vitest output (pasted under Verification).
- **AC-P11** adding a program is data only. Commit `d3f0c0b` adds the fake major
  and touches 4 test files and **zero** source files. The engine was written and
  committed before that fixture existed.
- **AC-P15** (F-09), **AC-P16** (F-03 and F-03b), plus F-04, F-06, F-07, F-10,
  F-11, F-12 asserted by golden.
- **AC-I03** `packages/shared` untouched by this branch.
- **AC-I04** no DOM, no `Date.now()`, no `Math.random()`; no `dom` lib; the
  engine imports only `@gradguide/shared`.

### Files Changed

62 files, all under `packages/engine/`, plus `docs/status/agent-frontend.md` and
this file.

- `src/`: context, resolvedCourse, filters, ordering, overlap, constraints,
  assignment, manual, externalCredit, evaluate, index, and
  `rules/{course,attribute,credits,gpa,attested,deferred,settlement}`
- `test/`: 9 test files, a 40-course hand-written fixture catalog, 13 plan
  fixtures, 2 fixture programs, 13 goldens
- **`package-lock.json` (1 file, +11 lines).** Outside the letter of TASK-020's
  scope clause. npm workspaces requires it to register the new package; the diff
  is only the `@gradguide/engine` entry. Flagged rather than hidden.

### Contracts

`@gradguide/engine` exports, consumed by TASK-021 to TASK-025:

```ts
evaluate(plan: StudentPlan, programs: Program[], catalog: Course[]): Result[]
resolveExternalCredit(input: ExternalCreditInput, rules: ExternalCreditRules): ExternalCredit
countExternalCredits(credits: ExternalCredit[], caps: CreditCaps): { advancedStanding: number; notes: string[] }
mayShare(a: Requirement, b: Requirement): boolean
const EXAM_PSEUDO_ID: CourseId   // { EXAM, 0, "", EXT } -> courseKey "EXAM 000 EXT"
type EvalContext, type ResolvedCourse
```

`Result[]` is ordered program then requirement; `satisfiedBy` and `candidates`
are sorted by `courseKey`; identical inputs give byte-identical output.

No change to `docs/API.md` or `packages/shared` is requested. **No contract
change request.**

### Skills Used

| Skill | Stage invoked | What it actually changed |
|---|---|---|
| `superpowers:verification-before-completion` | Before committing the round-0 BLOCKED record | Forced a proving command per claim. Caught three sub-checks that had silently failed on macOS (`cat -A` is GNU-only) and which I had already written up as verified, and caught `using-superpowers` listed as invoked when it was only preloaded by the SessionStart hook. |
| `superpowers:test-driven-development` | Before the first engine module | Set the test-first order for all 9 test files. Every module had a failing test first and the RED was watched each time. It is also why the three golden defects were findable: the fixtures existed before the behaviour did. |
| `superpowers:requesting-code-review` | After TASK-020 verification, before this handoff | Dispatched an independent reviewer over `5c3d4e8..d3f0c0b`; findings recorded under Known Issues. |
| `superpowers:verification-before-completion` | Immediately before claiming TASK-020 complete | Re-ran the full gate; no implementation work followed it. |

The four-skill frontend design pipeline was **not** invoked. TASK-020 has no UI
("The frontend design pipeline is NOT required for this task"), and protocol
section 18 places those skills immediately before major UI implementation. They
run at TASK-021.

### Verification

```
$ npx vitest run --root packages/engine
 Test Files  9 passed (9)
      Tests  138 passed (138)

$ npm test          # root, all workspaces
 @gradguide/engine  138 passed
 @gradguide/shared   13 passed

$ npm run typecheck   # engine + shared, tsc -p, no output = clean
$ npm run lint        # eslint ., no output = clean
```

AC-P10, every fixture named:

```
✓ golden fixtures > F-01 — on-track student: CI, five areas, WI, AD, one PE
✓ golden fixtures > F-02 — transfer student with pre-matriculation Breadth
✓ golden fixtures > F-03 — AP and IB credit, duplicate pair, advanced-standing cap
✓ golden fixtures > F-03b — exam threshold boundaries
✓ golden fixtures > F-04 — chair-granted override
✓ golden fixtures > F-05 — one course short of Area 4
✓ golden fixtures > F-06 — assignment conflict: rare AD course also carries Area 3
✓ golden fixtures > F-07 — deferred rule kinds beside GE
✓ golden fixtures > F-08 — fake major using only P0 rule kinds
✓ golden fixtures > F-09 — distinctDepartments: two Dance courses
✓ golden fixtures > F-10 — one course tagged both WI and SI
✓ golden fixtures > F-11 — two PE courses in the same term
✓ golden fixtures > F-12 — empty plan
✓ golden fixtures > evaluating a fixture twice is byte-identical
✓ golden fixtures > shuffling the record leaves the result unchanged
```

AC-P11:

```
$ git show --stat --oneline d3f0c0b
 packages/engine/test/fixtures/plans/F-08.json      |  91 ++++
 packages/engine/test/fixtures/programs/fake-major.json |  49 ++
 packages/engine/test/golden.test.ts                |   2 +
 packages/engine/test/golden/F-08.json              | 542 +++++++++++++++++++++
 4 files changed, 684 insertions(+)
$ git show --name-only --pretty=format: d3f0c0b | grep "src/"
 (no output)
```

AC-I04 and AC-I03:

```
$ grep -rn "document\.\|window\.\|Date\.now\|Math\.random" packages/engine/src
 (no output)
$ git log $(git merge-base HEAD main)..HEAD -- packages/shared
 (no output)
```

**The goldens were read by hand**, not merely generated. That review is what
produced findings 1 to 3 below.

### What Was NOT Verified

- **Nothing was run in a browser, and no screenshot exists.** TASK-020 is a pure
  Node package with no UI. `docs/review/` has no `F-*` artefact from this task.
  The browser-QA gate belongs to TASK-021 onward.
- **The engine has never been run against real catalog data.** Every test uses
  the 40-course hand-written fixture catalog, because `data/catalog.json` does
  not exist yet (backend TASK-010). Behaviour at 2,811 courses is unmeasured:
  in particular `candidatesFor` scans the whole catalog per requirement, which
  is fine at 40 courses and unprofiled at 2,811.
- **The bounded-search path is not exercised by any committed fixture.** After
  the phase-2 fix, no fixture reaches the 10,000-node limit, so the `bounded`
  note and the best-effort return are covered by construction and reasoning, not
  by a test that actually trips the bound.
- **`npm run build` was not run** — no workspace defines a build script yet
  (`apps/web` does not exist). Definition-of-Done item 5 is therefore unproven
  for this branch.
- **`scripts/contract-test.sh` was not run.** It validates `/data` artefacts,
  most of which the pipeline has not produced.
- I did not verify the GE encoding itself against the catalog. I consumed
  `data/programs/general-education-2026.json` as given; its correctness is the
  manager's (TASK-002) and the source-quote validator's.

### Known Issues

**Found by reading the goldens against ACCEPTANCE, with a green suite.** All
four are fixed; they are recorded because they say where this engine is fragile.

1. **F-11 reported `unmet` instead of `partial` 1 of 2.** The assignment
   tie-break from API.md 2.3 step 4 ("prefer the assignment that leaves the most
   courses unassigned") made the search prefer assigning *nothing* to a
   requirement it could not fully close, so a student with one PE course was
   told they owed two. Now scored satisfied, then progress toward what is still
   open, then courses spent. This was the worst of the four: it understates a
   student's progress on a real record.
2. **Every row of a 20-course plan carried "assignment search bounded".** The
   search only short-circuited when *every* requirement was satisfied, which
   never happens while Area 6 or Language is still owed, so ordinary plans
   exhausted the 10,000-node budget and returned a best-effort assignment. Now a
   greedy constrained-first pass settles it, and backtracking runs only over
   requirements that another assignment could actually close. The note is also
   confined to the rows it concerns rather than stamped on GPA and credit totals.
3. **Two exams granting different attributes shared one internal key**, because
   both report as the `EXAM 000 EXT` pseudo-id, so one grant could block another
   during assignment. Latent at P0 (only `LANGUAGE` is ever granted) and a real
   trap for P1.
4. **A Breadth area blocked by the department rule came back unmet with no
   reason.** Because the search *avoids* the `distinctDepartments` clash, the
   post-hoc reporter found nothing to report. A student would have seen "Area 6
   unmet" beside a Dance course they had passed, with no explanation. F-09
   requires the row to name the constraint, and it now does.

**Open, for the manager and reviewer:**

5. **The greedy pass is locally, not globally, optimal on courses spent.** In
   F-01 it closes Area 1 with ARTH 051 and Writing Intensive with ENGL 010,
   where ENGL 067 alone carries both attributes. Every requirement still ends
   satisfied; only which course is *named* differs. Backtracking does not run
   because nothing reachable is unmet. Fixing it means a global optimisation
   whose only observable effect is which of two true statements the UI shows,
   so I did not spend the complexity. Say if you disagree.
6. **F-06's golden diverges from ACCEPTANCE's prose.** The golden names
   AMST 110 on *both* `area-3` and `analyzing-difference`, because both
   requirements are `allowAll` and the catalog permits one course to count for
   both. ACCEPTANCE says "constrained-first assigns the rare course to AD and
   the common one to Area 3". Both readings end with both requirements
   satisfied, and API.md 2.3 step 4 actually favours the shared answer. This is
   a prose/behaviour divergence for the manager to settle, not something I
   silently changed. If the intended answer is the two-course one, the fixture
   needs an `exclusive` or `denyOnly` policy to make the conflict real.
7. `apps/web` does not exist yet, so nothing consumes these exports in anger.
   TASK-021 is the first real consumer.

### Commit

`d3f0c0b` (branch `agent/frontend`; range `5c3d4e8..d3f0c0b`, 8 commits).
Not pushed: this repository still has no remote (`git remote -v` is empty).
