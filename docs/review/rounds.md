# Round Ledger

**Source of truth for the `round` counter in `docs/AGENT_PROTOCOL.md` section 21.**
Owned by the reviewer, like everything else in `docs/review/`.

The counter used to live in each task's frontmatter. It could not survive there:
section 21 makes the reviewer the incrementer, section 3 makes `docs/tasks/*.md`
manager-owned, and section 15 keeps the reviewer on a branch of its own. Three
reasonable rules that together guaranteed every increment was stranded, so `main`
read `round: 0` for tasks already gated once and protocol 21's escalation
safeguard could never fire (ADR-019).

`scripts/tasks.sh` reads this file for the Round column in `docs/tasks/INDEX.md`.
`scripts/integrate.sh` merges `agent/reviewer` last, so this file reaches `main`.

Append a row per verdict. Never edit a past row; a task at round 3 has three rows.

**`Commit` is the owning branch's head at the moment of the verdict.** It is what
distinguishes a fresh `REVIEW` from a task sent back and not yet picked up: gate a
task at `REVIEW` only when its branch head differs from its last row here
(`docs/AGENT_PROTOCOL.md` section 21, ADR-023). Rows seeded before this column
existed carry `—`.

| Task | Round | Verdict | Date | Commit | Findings |
|---|---|---|---|---|---|
| TASK-010 | 1 | CHANGES_REQUIRED | 2026-09-08 | — | H-1, H-2, M-5 |
| TASK-011 | 1 | CHANGES_REQUIRED | 2026-09-08 | — | H-3, H-4, H-6 |
| TASK-012 | 1 | CHANGES_REQUIRED | 2026-09-08 | — | H-5, M-5, L-7 |
| TASK-013 | 1 | CHANGES_REQUIRED | 2026-09-08 | — | M-4; AC-B07 unverifiable |
| TASK-020 | 1 | CHANGES_REQUIRED | 2026-09-08 | — | M-1, M-2, M-3, unrouted gpa CCR |
| TASK-021 | 1 | APPROVED | 2026-09-08 | — | M-6, M-8 advisory -> DEBT |
| TASK-022 | 1 | APPROVED | 2026-09-08 | — | M-7 advisory -> DEBT |
| TASK-023 | 1 | APPROVED | 2026-09-08 | — | verified live |
| TASK-024 | 1 | APPROVED | 2026-09-08 | — | verified live |
| TASK-025 | 1 | CHANGES_REQUIRED | 2026-09-08 | — | AC-D02 evidence gap, not a defect |
