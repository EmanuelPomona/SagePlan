# STATUS: agent/backend
Task: TASK-010, TASK-011, TASK-012, TASK-013 — all implemented, status REVIEW
Round: 0
Last updated: 2026-09-08T21:14:35Z

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
