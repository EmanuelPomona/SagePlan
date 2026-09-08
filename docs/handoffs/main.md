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
