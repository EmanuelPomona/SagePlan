# Multi-Agent Claude Code Template

A golden template for running specialized Claude Code agents in parallel Git
worktrees: a manager that plans and integrates, implementation agents that build,
and an independent reviewer that gates.

---

## Start a project

```bash
scripts/new-project.sh StreetSafe-LA     # clone + 3 worktrees + branches at one commit
cd ../StreetSafe-LA
scripts/status.sh                        # confirm the baseline
scripts/launch-agents.sh                 # prints the four terminal commands
```

**Manager goes first, alone**, until `docs/tasks/` has READY tasks. Then frontend
and backend run in parallel.

## The loop

```
manager (plan)  ->  commit to main  ->  scripts/sync.sh
                                             |
                            frontend  +  backend  in parallel
                                             |
                    manager (FRESH session) -> scripts/integrate.sh
                                             |
                                    scripts/sync.sh -> reviewer
                                             |
                          APPROVED / CHANGES_REQUIRED / BLOCKED / ESCALATE
```

Manager is one agent with two modes. Start a **fresh session** for integration —
planning fills its context with prose that integration does not need.

## Scripts

| Script | Does |
|---|---|
| `new-project.sh` | Template -> project with all worktrees |
| `new-agent.sh <slice>` | Add a fifth+ agent as a slice |
| `launch-agents.sh` | Print (or `--open`) the terminal commands |
| `bootstrap.sh` | Deps, `.env`, **non-colliding ports**, seed data |
| `status.sh` | Every branch, head, ahead-count, current task. **Replaces carrying commit hashes** |
| `sync.sh` | Merge `main` into every worktree, report conflicts |
| `integrate.sh` | Merge workers into `main` in order, stop on conflict |
| `audit-skills.sh` | Skills actually invoked vs. claimed. Exit 3 = fabricated claim |
| `contract-test.sh` | Implementation vs `docs/openapi.yaml`. Exit 2 = could not verify |
| `slop-check.sh` | Mechanical subset of the design constraints |
| `tasks.sh` | Regenerate `docs/tasks/INDEX.md` |
| `retro.sh` | Raw material for `docs/RETRO.md` |

## What is enforced, not just requested

Self-reported process claims are the weak point of any agent system, so these are
checked by machine:

- **Skill claims** — `audit-skills.sh` reads the session transcript. A skill in a
  handoff's Skills Used table that is absent from the transcript is a CRITICAL
  finding.
- **Browser QA** — APPROVED requires screenshot and console artifacts in
  `docs/review/`. There is no "tooling unavailable" exemption; that is BLOCKED.
- **Contract conformance** — `contract-test.sh` against `docs/openapi.yaml`.
- **Loop termination** — three rounds per task maximum, then APPROVED-WITH-DEBT or
  ESCALATE. A finding that recurs escalates immediately.
- **Protocol invariants** — CI fails if the design constraints get duplicated, if
  `CLAUDE.md` is truncated, if the task index is stale, or if a secret appears.

## Files

```
CLAUDE.md                    short, cross-cutting rules only
docs/AGENT_PROTOCOL.md       the operating protocol — single source of truth
docs/DESIGN_CONSTRAINTS.md   visual constraints — the ONLY copy
docs/SKILL_ROUTING.md        which skill at which stage
docs/tasks/<id>.md           one file per task, YAML frontmatter, INDEX generated
docs/handoffs/<branch>.md    one file per branch — never shared, never conflicts
docs/status/<branch>.md      durable working state; survives context compaction
docs/review/                 verification evidence (committed on purpose)
docs/DEBT.md                 accepted findings
docs/RETRO.md                what changes the template next time
.claude/agents/*.md          the four agent definitions
```

## Adding a fifth agent

Beyond the baseline four, add agents as **slices** (one user-facing capability
owned end to end), not as roles. Role splitting stops working once a feature spans
frontend and backend; slices keep merging clean.

```bash
scripts/new-agent.sh search
```

The test for a good slice: can its owner demo it without any other agent's work
being finished?

## Your role

Product owner, decision maker, creative director. You supply the idea, the
constraints, and the taste. You should not be a message bus — `status.sh`,
`sync.sh`, and `integrate.sh` exist so that agents coordinate through git and
files rather than through you.

Two things stay yours on purpose: **taste disputes** (visual findings are advisory
and escalate to you) and **the decision to ship**.
