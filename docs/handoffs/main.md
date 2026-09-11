# Handoffs — main (manager)

## HANDOFF-1 — main — 2026-09-08

### Summary
Planning (Mode A) for Pomona GradGuide P0 is complete. The brief
(`Pomona-Degree-Planner/docs/PROJECT_BRIEF.md`) is decomposed into contract
documents, the shared contract package, the GE program encoded as data with
verbatim catalog quotes, and 13 tasks (10 READY for two workers). Owner
decisions taken during planning: two workers (frontend owns engine + UI),
manager authored shared types and GE JSON, Registrar CSV committed, and **one
page, no tabs**.

### Tasks Completed
- TASK-001 Shared contract package: typecheck, lint, 13 tests, openapi current (all AC checked in the task file).
- TASK-002 GE program + external credit rules: validate-artefacts 0 failures, every quote verbatim (all AC checked).

### Files Changed
- docs: PRODUCT, DESIGN_BRIEF, ARCHITECTURE, API, openapi.yaml (generated), DATABASE, ACCEPTANCE, DECISIONS (ADR-001..010), status/main, handoffs/main, tasks/TASK-001..002, 010..013, 020..025, 090, tasks/INDEX
- packages/shared/** (contract), package.json, package-lock.json, tsconfig.base.json, eslint.config.js
- data/programs/general-education-2026.json, data/external-credit-rules.json, data/sources/** (Registrar CSV 4.7 MB, 10 catalog page snapshots + index)
- scripts/contract-test.sh (rewritten), .env.example, .gitignore, .github/workflows/ci.yml, README.md
- removed: frontend/.gitkeep, backend/.gitkeep, tests/.gitkeep

### Contracts
- `packages/shared` (authoritative), `docs/API.md` (prose), `docs/openapi.yaml` (generated), `docs/DATABASE.md` (browser persistence). Consumers: pipeline (backend), engine + web (frontend). Change procedure: protocol §6; only the manager edits.
- Engine contract: `evaluate(plan, programs, catalog): Result[]`, `resolveExternalCredit(input, rules): ExternalCredit`, `EXAM_PSEUDO_ID` (API.md §2; TASK-020 implements).
- Web store contract for frontend tasks: `usePlan()`, `useData()`, `useAudit()` (TASK-021 defines).

### Skills Used
| Skill | Stage invoked | What it actually changed |
|---|---|---|
| superpowers:brainstorming | start, before defining the solution | classified architectural; surfaced three owner decisions (engine owner, manager scope, CSV); absorbed the single-page instruction |
| ecc:product-lens | before PRODUCT.md | Mode 1 diagnostic embedded in PRODUCT.md, GO recommendation, opt-in success metric (no telemetry) |
| ecc:contract-first | before finalizing shared interfaces | one authoritative artifact (zod), generated openapi, consumer/provider table, versioning policy, checklist in API.md §7 |
| superpowers:writing-plans | before task decomposition | task files carry exact files, interfaces consumed/produced, tests-first lists, AC by ID; fixture-data fallback added (ADR-009) |
| ecc:architecture-decision-records | recording cross-cutting decisions | ADR-001..010 in DECISIONS.md in Nygard format |
| superpowers:verification-before-completion | immediately before this handoff and the commit | forced re-run of typecheck/lint with explicit exit codes after a zsh $PIPESTATUS blank |

### Verification
```
npm run typecheck            -> rc=0
npm run lint                 -> rc=0
npx vitest run --root packages/shared -> rc=0  (Tests  13 passed (13))
npx tsx packages/shared/scripts/emit-openapi.ts --check -> rc=0 (current, 46 schemas)
npx tsx packages/shared/scripts/validate-artefacts.ts   -> rc=2  (3 check(s), 0 failed, generated artefacts NOT VERIFIED)
scripts/contract-test.sh     -> exit 2: hand-written data + openapi valid; generated artefacts NOT VERIFIED (pipeline not built yet)
scripts/tasks.sh             -> INDEX.md current (13 tasks); diff clean
CI invariants                -> design constraints in exactly one file; handoff schema in exactly one file; no shared HANDOFFS/TASKS; CLAUDE.md intact; scripts parse; no secret patterns; .env ignored
curl https://catalog.pomona.edu/pages/D3W4Xk0UrEr5WCruEh1T -> HTTP 200 (snapshots taken 2026-09-08)
curl app.coursedog.com .../catalogs/eziiW38FfLsoDlBqEZgV with Origin header -> HTTP 200 (page tree only; course search endpoint not exercised)
```

### What Was NOT Verified
- No generated artefact exists yet (catalog, sections, history, manifest); `contract-test.sh` exits 2 by design. Nothing about the Coursedog course endpoint's actual record shape or attribute strings was checked; TASK-010 must discover them.
- No engine and no web app exist; the engine semantics in API.md §2 are a specification, not tested behaviour. The fixture list in ACCEPTANCE.md has not been executed.
- `npm run build` was not run (no app workspace yet). The CI workflow was edited but not executed on GitHub.
- The catalog-page snapshot extraction rules (Nuxt payload tabs, anchor substitution) were run once by hand; TASK-013 must reproduce them programmatically.
- Three GE requirements carry `confidence: draft` (area-6 credit-sum reading, transfer post-matriculation reading, residency without Claremont courses) and the A-Level credit cutoff is `unverified`; none confirmed with the Registrar.
- AP semester/year durations in external-credit-rules.json follow College Board course length and were not checked against a Pomona source.
- Design brief choices (type, palette) are untested in a browser; frontend's design pipeline is the check.

### Known Issues
- Brief §14 fixture 3b said "IB SL 7 never qualifies"; the catalog says IB Language A SL 6–7 satisfies the language requirement (credit remains HL-only). ACCEPTANCE F-03b and ADR-007 record the correction.
- Brief §8 assumed overlays `allowAll`; the catalog forbids one course counting for both WI and SI (encoded as `denyOnly`).
- The Registrar CSV (4.7 MB) is committed on purpose so the cross-source validator runs in CI.
- README "Successor" line is unfilled; launch is gated on it.

### Commit
`main` HEAD after this handoff (`git rev-parse main`). Message: "plan: decompose PROJECT_BRIEF into contracts, shared package, GE data and tasks".

## HANDOFF-2 — main — 2026-09-11

### Summary
v1 re-scope after the owner reviewed the running app, plus the two manager
rulings the reviewer was blocked on. No implementation; contracts, decisions and
four new tasks. Owner chose: paste-first transcript, one always-visible
requirement map (not three overlays), light default with quiet family hues, and
the catalog quote moved into the expanded row.

### Tasks Completed
None closed. TASK-030..033 created READY for agent/frontend, in that execution
order. TASK-010..013, 020, 025 remain the workers' round-1 fix work.

### Files Changed
- `packages/shared/src/plan.ts` — `CompletedCourse.term`, `.grade`, `.gradeMode`, `StudentPlan.matriculationTerm` now nullable; `emptyPlan` takes `null`
- `docs/openapi.yaml` regenerated (46 schemas, unchanged count)
- `data/programs/general-education-2026.json` — `gpa` moved from `requirements` (18 -> 17) to `advisories` (7 -> 8)
- `docs/API.md` — gpa scope ruling (2.2), assignment tie-break rewritten (2.3 step 4), new 2.7 bounded evaluation, null-grade semantics
- `docs/DECISIONS.md` — ADR-011..015
- `docs/DESIGN_BRIEF.md` — v1 revision banner, new structural layout with the map, three families, node grammar, family hues, measurable density targets, light default, signature element now twofold
- `docs/ACCEPTANCE.md` — AC-V01..V11; fixtures F-01/F-05/F-06/F-12 corrected; F-13, F-14 added; AC-P02 reworded
- `docs/PRODUCT.md` — v1 scope-change table
- `docs/tasks/TASK-030..033`, `INDEX.md`
- `docs/design-refs/v1-requirement-map-reference.png` — the owner's reference
- `.gitignore`, `data/sources/samples/README.md` — transcript samples stay local

### Contracts
Changed by the manager, as owner: `CompletedCourse` and `StudentPlan` widen
(nullable term/grade/gradeMode/matriculationTerm). **No `schemaVersion` bump and
no migration**: every existing plan still validates, and nothing is deployed.
`Rule`, `Result`, `Program` and every artefact schema are unchanged.
Engine semantics changed in `docs/API.md` 2.2, 2.3 and the new 2.7.

### Rulings the reviewer was waiting on
- **H-1 / M-3 — agent/frontend's `gpa` scope CONTRACT CHANGE REQUEST is resolved** (ADR-014): proposal 1 accepted verbatim, proposal 2 (`courseSet`) rejected for now. The shipped interim behaviour is permanent. The unrouted request was the manager's defect, not the worker's.
- **M-2 — the assignment tie-break was my spec bug** (ADR-013). "Prefer the assignment leaving the most courses unassigned" maximised sharing and contradicted its own rationale. Replaced with minimize-sharing.

### Skills Used
| Skill | Stage invoked | What it actually changed |
|---|---|---|
| ecc:architecture-decision-records | while recording the five cross-cutting v1 decisions | ADR-011..015 in Nygard format, each carrying the alternative that was rejected and why |
| superpowers:verification-before-completion | immediately before this handoff and the commit | forced the re-run below with explicit exit codes, and caught that `data/sources/samples/` as a directory pattern made its own README unreachable to `!` negation |

### Verification
```
npm run typecheck                                        -> rc=0
npm run lint                                             -> rc=0
npx vitest run --root packages/shared                    -> rc=0 (Tests  13 passed (13))
npx tsx packages/shared/scripts/emit-openapi.ts --check   -> rc=0 (current, 46 schemas)
npx tsx packages/shared/scripts/validate-artefacts.ts     -> rc=2 (3 check(s), 0 failed, generated artefacts NOT VERIFIED)
scripts/tasks.sh + diff                                  -> INDEX.md current, 17 tasks
git check-ignore data/sources/samples/{transcript.pdf,README.md} -> PDF ignored, README tracked
design constraints copies                                -> docs/DESIGN_CONSTRAINTS.md only
secret scan                                              -> none
```

### What Was NOT Verified
- **Nothing in this handoff was run against the app.** No engine, web or pipeline test was executed: those live on worker branches and this session only changed `packages/shared`, `data/` and `docs/`. The GE program's 17 requirements were not re-evaluated by the engine, so the claim that removing the gpa row leaves F-01 otherwise unchanged is a specification, not a measurement — TASK-030 must prove it.
- The nullable-field change was typechecked only against `packages/shared`. `packages/engine` and `apps/web` almost certainly have type errors against the widened types until TASK-030 and TASK-032 land; I did not check how many.
- Bounded evaluation (API.md 2.7) is unimplemented and untested. Its cost, and whether the pessimistic pass is well-defined for every rule kind, is asserted, not demonstrated.
- The density targets (map <= 320px, row <= 40px, map above the fold at 1440x900) are design intent. Nobody has built the map, so nobody knows whether twelve nodes with a course code under each fit in 320px at the brief's type scale. TASK-033 is instructed to stop and escalate rather than shrink type to hit it.
- Family hue legibility against the status palette is unverified and flagged as a risk in the brief with explicit permission to drop it.
- The transcript parser's shapes are my guesses about a Pomona transcript. No sample exists.
- I did not re-run the backend's pipeline or re-check the reviewer's round-1 backend findings; they are unaffected by this session but also unfixed.

### Known Issues
- `main` still has **neither worker merged**. The reviewer integrated into `agent/reviewer` to review. Integration into `main` is still owed, and must happen in a fresh session.
- Reviewer round-1 findings H-2..H-6, M-4, M-5 and D-01..D-10 are open. M-5 (six placeholder `TEST 001 PZ`-style records reachable from autocomplete) directly undercuts v1's entry goal and is called out to backend as first priority.
- AC-P11 was ticked in round 1 against a fixture that used `scope: "program"`; it is not re-established until TASK-030 moves `fake-major.json` to `scope: "overall"`.

### Commit
See `git log -1 main` after this handoff.
