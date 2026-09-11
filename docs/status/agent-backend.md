# STATUS: agent/backend
Task: TASK-010..013 — round-2 fixes complete against ADR-016/ADR-017.
Closed: M-5/AC-B00, H-2/AC-B01, AC-B01b, H-3/AC-P09, H-4, M-4, L-7, L-10, L-1, L-6.
ADR-020 follow-ups done: AC-B03 re-measured against its now-stated population
(2004 PO courses, 8 anomalies, not 3 and 10); D-12's nineteen double-credit PE
courses listed; AC-B04 asserted by tests. H-5 ruled not-a-defect, H-6 deferred to
D-12 pending the Registrar, AC-B07 is owner action D-11.
OPEN FOR THE MANAGER: AC-B03 specifies credits.max < 1, the exact predicate
reviewer H-4 called a bug. I implemented the contract and report the H-4 case
(GEOL 189V PO) separately rather than retire the finding silently.
Round: 2
Last updated: 2026-09-11T23:16:59Z

## Skills invoked so far
- `ecc:backend-patterns` @ before structuring packages/pipeline -> confirmed the
  I/O vs pure vs orchestration split; took the typed-error-carrying-status shape
  for `PipelineError`, retry-with-exponential-backoff for `http.ts`, and
  one-line-per-phase structured logging. Its REST/repository/DB/cache/JWT/rate-limit
  material has no subject here (no server, no database, no auth) and was not applied.
- `ecc:contract-first` @ before writing against packages/shared -> its "never change
  the implementation first, then the contract" rule is why the AC-B01 count, the
  duplicate-edition policy and the divergence threshold went to the manager as a
  CONTRACT CHANGE REQUEST instead of being decided in my normaliser; its "do not
  expose a storage row and call it a contract" rule is why the raw upstream shapes
  stay quarantined in `coursedog/raw.ts` and `hyperschedule/raw.ts`.
- `superpowers:test-driven-development` @ before every parser, normaliser,
  validator and command -> each module was written test-first and watched fail
  first. It caught two real defects before they shipped: my prereq regex matching
  a Coursedog internal id ("DHQF80BF") as a course code, and the CSV fixture
  generator mangling escaped quotes.
- `ecc:error-handling` @ before http.ts and write.ts -> "retry only retriable
  errors" is why 401/403 fail on the first attempt instead of being retried three
  times; validate-then-temp-file-then-rename is why a failed write cannot leave a
  partial artefact.
- `superpowers:requesting-code-review` @ after implementation, before handoff ->
  dispatched an adversarial reviewer subagent over ef81a0f..e3a87d8.
- `superpowers:verification-before-completion` @ immediately before the handoff.

Deliberately NOT invoked, with reasons (protocol section 1 forbids invoking a skill
just to tick a box): `ecc:api-design` (REST endpoint design — this project ships
files, not endpoints; I consume two upstream APIs and design none) and
`ecc:security-review` (no user input, no secrets, no auth surface; the workflow
uses only GITHUB_TOKEN via `permissions:`). TASK-010's own skill list omits both
for the same reasons. `superpowers:systematic-debugging` was not needed: no
non-trivial defect survived a first reading — the failures I hit were each
diagnosed from one command's output.

## Done
- [x] Synced main (fast-forward 2cb1b6a -> 5c3d4e8) and read the full contract set
- [x] Filed a CONTRACT CHANGE REQUEST (4 items) before writing code; committed d162e78
- [x] TASK-010 — packages/pipeline scaffold + Coursedog catalog ingestion
- [x] TASK-011 — registrar UTF-16 CSV parser, pivot, validators 3 and 5
- [x] TASK-012 — Hyperschedule sections, offering history, 5C catalog merge, validator 4
- [x] TASK-013 — manifest, validators 1/2/6/7/8, pipeline:all, nightly workflow
- [x] Commits: d162e78 (contract request), ef81a0f (010+011), e3a87d8 (012+013)

## Verified
- `npm test` -> rc=0, 233 tests (220 pipeline + 13 shared)
- `npm run typecheck` -> rc=0 ; `npm run lint` -> rc=0
- `npm run pipeline:catalog` -> 2,811 records -> 2,233 Active -> 2,087 unique courses, unmapped=0
- `--from-csv` -> PO course set IDENTICAL to the API run (0 differences either way)
- AC-P08: `COURSEDOG_ORIGIN=https://wrong.example` -> exit 1, "HTTP 401", `git status data/` clean
- `npm run pipeline:sections -- FA2026 SP2027` -> FA2026 2,159 sections; SP2027 404 (not published) skipped with a warning
- catalog 2,087 -> 2,989 across 12 campuses; all 2,005 PO entries byte-identical before/after the merge
- `npm run pipeline:history -- FA2026` -> 1,416 courses, 32 ascending knownTerms
- `npm run pipeline:all` -> exit 0, six steps ok
- `data/reports/validation.json` -> 8 checks by id, ok=true
- `scripts/contract-test.sh` -> exit 0, "6 check(s), 0 failed", CONTRACT OK
- `npm run seed` -> exit 0

## Round 2 — remaining review findings closed
The five Minor findings HANDOFF-2 listed as acknowledged-but-unfixed are now fixed:
- 22 `write.ts` fsyncs before rename, and sweeps temp files an interrupted run
  orphaned (matched by an anchored pattern, so it can only ever remove one of ours).
- 23 Coursedog pagination is capped at 10 pages; a runaway upstream now throws
  instead of accumulating until the process dies.
- 24 A Hyperschedule section with NO credit value is refused rather than recorded
  as 0 credits, which both invented a fact and tripped the partial-credit
  exclusion validator. A genuine 0 is still kept as 0. Verified against live data:
  0 courses added, 0 removed — a guard against drift, not a behaviour change.
- 25 The three bare `catch {}` blocks now report: an unreadable term file is
  surfaced by validator 4 (it silently narrowed that check's coverage before), and
  an unparseable programs file or catalog-pages index is reported by validator 7.
- 16 The dedupe discard reason is derived, not asserted.
Findings 1-15 and 17-21 were closed in b14d3cb, with 17 pushed back on with evidence.

## Blocked on
- nothing blocking. **Two contract items still need the manager's ratification**
  (see `docs/handoffs/agent-backend.md`): the AC-B01 course-count criterion and
  the duplicate-edition resolution rule. Both are implemented against my proposals
  on the owner's instruction to proceed; reversing the dedupe rule would strip GE
  tags from 55 courses.

## Note for the manager at integration
`docs/tasks/INDEX.md` is deliberately not committed from this branch — it is a
generated, repo-wide table and `CLAUDE.md` forbids writing shared documents from
a branch. Task frontmatter carries the authoritative status; run `scripts/tasks.sh`.
