# STATUS: agent/backend
Task: TASK-010 — BLOCKED (contract) (then 011, 012, 013)
Round: 0
Last updated: 2026-09-08T20:30:40Z

## Assigned tasks

| ID | Status | Depends on | Title |
|---|---|---|---|
| TASK-010 | READY | — | Pipeline scaffold + Coursedog catalog ingestion -> data/catalog.json |
| TASK-011 | READY | TASK-010 | Registrar GE CSV parser, cross-source validator, exclusion anomalies |
| TASK-012 | READY | TASK-010 | Hyperschedule sections + offering history; 5C catalog merge |
| TASK-013 | READY | 010,011,012 | Manifest, validators 1-8, nightly workflow |

Order: 010 -> (011 | 012) -> 013.

## Skills invoked so far
- `ecc:backend-patterns` @ before structuring packages/pipeline -> confirmed the
  I/O vs pure vs orchestration split the task's file layout already implies
  (client.ts fetches, normalise.ts is pure, commands/ orchestrates); took the
  typed-error-carrying-status shape for `PipelineError`, retry-with-exponential-
  backoff for `http.ts`, and structured one-line-per-phase logging. Most of the
  skill (REST routing, repositories, DB/N+1, Redis cache, JWT/RBAC, rate limits)
  has no subject here — no server, no database, no auth — and was not applied.
- `ecc:contract-first` @ before writing against packages/shared and before
  raising the change request -> its "never change implementation first, then the
  contract" rule is why the AC-B01 count and the duplicate-edition policy went to
  the manager as a CONTRACT CHANGE REQUEST instead of being decided in my
  normaliser; its "do not expose a storage row and call it a contract" rule is
  why the raw Coursedog shape stays quarantined in `coursedog/raw.ts` and never
  reaches `Course`.

## Done
- [x] Confirmed branch: `git rev-parse --abbrev-ref HEAD` -> agent/backend
- [x] Read CLAUDE.md, docs/AGENT_PROTOCOL.md, docs/SKILL_ROUTING.md
- [x] Read docs/status/agent-backend.md (was: unassigned, round 0)
- [x] Synced main into agent/backend: fast-forward 2cb1b6a -> 5c3d4e8.
      Manager's plan commit carried the contracts, shared package, GE data and
      13 task files. My worktree only; I did not run scripts/sync.sh (it would
      write into the frontend and reviewer worktrees, which I do not own).
- [x] Read docs/PRODUCT.md, ARCHITECTURE.md, API.md, DATABASE.md, ACCEPTANCE.md,
      openapi.yaml, handoffs/main.md, and my four task files in full
- [x] Read the contract I consume: packages/shared/src/{index,ids,catalog,artefacts,registry}.ts
- [x] Established a green baseline before writing any code (evidence below)

## In progress
- [ ] TASK-010 unaffected scope (proceeding per protocol section 6 step 5, since neither
      resolution changes it): env.ts, http.ts, write.ts, meta.ts, coursedog/raw.ts,
      attributeMap.ts, normalise.ts, csvFallback.ts, cli.ts + tests.
      Next concrete action: invoke `superpowers:test-driven-development`, then
      capture the 20-record fixture from the payload already fetched, then write
      `attributeMap.test.ts` red before `attributeMap.ts`.

## Verified
- branch -> `agent/backend` (git rev-parse --abbrev-ref HEAD)
- toolchain -> node v26.7.0, npm 11.19.0 (root engines: >=22)
- `npm ci` -> 159 packages, 0 vulnerabilities
- `npm run typecheck` -> rc=0
- `npm run lint` -> rc=0
- `npm test` -> rc=0, "Test Files 3 passed (3) / Tests 13 passed (13)" (shared only; no pipeline package exists yet)
- `scripts/contract-test.sh` -> rc=2, "3 check(s), 0 failed, generated artefacts NOT VERIFIED".
  This is the documented pre-pipeline state (API.md section 5: exits 2, never 0, when it could not verify).
  Driving it to rc=0 is TASK-013 AC-B06/AC-I01.

## Architecture note (scope guard)
"Backend" on this project is `packages/pipeline` — TypeScript ingestion scripts
run by tsx and GitHub Actions. There is **no server, no database, no Express, no
FastAPI, no auth** (ARCHITECTURE.md section Pipeline; TASK-010 restates it). Deliverables are
files in /data. I will reject any such proposal and cite that section.
Consequence for my required skill sequence: `ecc:api-design` (REST endpoint
design) has no subject on this project — I consume two upstream APIs, I do not
design one — and `ecc:security-review` has no user input, no secrets and no
auth surface. TASK-010's own skill list omits both for these reasons. I will
record them as deliberately not invoked rather than invoke them to satisfy a
checklist (protocol section 1 forbids that) and will invoke `ecc:security-review`
if TASK-013's workflow work introduces a credential or a token.

## Blocked on
- **TASK-010, `blocked_on: contract`** — CONTRACT CHANGE REQUEST filed in
  `docs/handoffs/agent-backend.md`, committed so it is visible outside this
  session. Two items need the manager:
  1. **AC-B01 ">= 2,700 courses" is unmeetable honestly.** The 2,811 figure counts
     `status` Banked/Inactive administrative rows (`PE WAIVER`, `REG PENDING`,
     `TEST001 PO` "Your Course 101"). Active = 2,235; after de-duplication ~2,093.
     No filter that excludes the junk reaches 2,700. Proposed: ingest Active only,
     floor at >= 2,000.
  2. **139 duplicate course records; "newest wins" is wrong.** 56 groups disagree
     on GE attributes and in 55 of them the highest `_id` edition is the one with
     `attributes: []`. Picking it would mark 55 courses as carrying no GE tag ->
     the engine answers `unmet` for requirements a student has satisfied.
     Proposed: keep the most complete record; report the discards.
- Not blocked: TASK-011, TASK-012, TASK-013 (they depend on TASK-010's output,
  not on this decision).

## Note for the manager at integration
`docs/tasks/INDEX.md` is **deliberately not committed** from this branch. It is a
generated, repo-wide table covering every agent's tasks, and `CLAUDE.md`
("Communication") forbids writing to a shared document from a branch because two
agents regenerating it collide in the same rows. The authoritative signal is the
frontmatter in `docs/tasks/TASK-010-coursedog-catalog-ingestion.md`
(`status: BLOCKED`, `blocked_on: "contract"`). Run `scripts/tasks.sh` at
integration to refresh the index.
