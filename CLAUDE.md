# Multi-Agent Engineering Rules

Project-wide rules for every agent. The full operating protocol is in
`docs/AGENT_PROTOCOL.md`, imported at the bottom of this file.

This file is deliberately short. Anything that belongs to one role lives in that
role's agent definition; anything cross-cutting lives in the protocol. Rules
stated twice drift, so they are stated once.

---

## Source of Truth

| Topic | File |
|---|---|
| API behavior | `docs/API.md` + `docs/openapi.yaml` |
| Database structure | `docs/DATABASE.md` |
| Visual constraints | `docs/DESIGN_CONSTRAINTS.md` |
| Definition of Done | `docs/AGENT_PROTOCOL.md` section 5 |
| Handoff format | `docs/AGENT_PROTOCOL.md` section 16 |

No agent silently changes a contract another agent consumes. The procedure for
changing one is `docs/AGENT_PROTOCOL.md` section 6.

---

## Secrets

Never commit API keys, passwords, access tokens, service account credentials,
`.env`, or private certificates.

Use environment variables. `.env.example` is committed; `.env` is not.
`scripts/bootstrap.sh` materializes `.env` per worktree with non-colliding ports.

---

## MVP Philosophy

Prefer working functionality, simple architecture, fast iteration, a clear user
experience, and reliable demo paths.

Avoid premature optimization, unnecessary services, elaborate abstractions,
out-of-scope features, and large refactors during final integration.

This is a bias, not a prohibition. On a project running longer than a few days,
the cost of skipped tests and skipped abstractions arrives before the deadline
does — see `docs/AGENT_PROTOCOL.md` section 14 for where the line actually sits.

---

## Before Coding

1. Read this file and `docs/AGENT_PROTOCOL.md`.
2. Read `docs/status/<your-branch-slug>.md`. If it exists, you are resuming — it
   is the record, not your context summary.
3. Read your assigned task in `docs/tasks/`.
4. Read the source-of-truth documents your role needs.
5. Confirm your branch: `git rev-parse --abbrev-ref HEAD`.
6. Inspect existing code before modifying anything.
7. Identify dependencies on another agent's work.

---

## Communication

Agents communicate through files, never through the human:

| Purpose | Where |
|---|---|
| Task definition and status | `docs/tasks/<id>.md` |
| Integration info for consumers | `docs/handoffs/<your-branch-slug>.md` |
| Your own working state | `docs/status/<your-branch-slug>.md` |
| Cross-cutting decisions | `docs/DECISIONS.md` |
| Verification evidence | `docs/review/` |

**Write only to files that carry your own branch slug.** Never append to a shared
document from a branch — that is a merge conflict a human has to resolve.

Keep entries structured and concise. These are engineering records, not
conversation logs. Move anything older than the current round to `docs/archive/`.

---

## When Blocked

1. Determine the exact blocker.
2. Check the project documentation.
3. Check whether another agent owns the dependency.
4. Record it in `docs/status/<your-branch-slug>.md` under `## Blocked on`, and set
   `status: BLOCKED` in the task file.
5. Do not invent an incompatible workaround.
6. Commit and push so the blocker is visible outside your session.
7. Continue with unaffected work.

---

# Multi-Agent Operating Protocol
@docs/AGENT_PROTOCOL.md
