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

| Task | Round | Verdict | Date | Findings |
|---|---|---|---|---|
| TASK-010 | 1 | CHANGES_REQUIRED | 2026-09-08 | H-1, H-2, M-5 |
| TASK-011 | 1 | CHANGES_REQUIRED | 2026-09-08 | H-3, H-4, H-6 |
| TASK-012 | 1 | CHANGES_REQUIRED | 2026-09-08 | H-5, M-5, L-7 |
| TASK-013 | 1 | CHANGES_REQUIRED | 2026-09-08 | M-4; AC-B07 unverifiable |
| TASK-020 | 1 | CHANGES_REQUIRED | 2026-09-08 | M-1, M-2, M-3, unrouted gpa CCR |
| TASK-021 | 1 | APPROVED | 2026-09-08 | M-6, M-8 advisory -> DEBT |
| TASK-022 | 1 | APPROVED | 2026-09-08 | M-7 advisory -> DEBT |
| TASK-023 | 1 | APPROVED | 2026-09-08 | verified live |
| TASK-024 | 1 | APPROVED | 2026-09-08 | verified live |
| TASK-025 | 1 | CHANGES_REQUIRED | 2026-09-08 | AC-D02 evidence gap, not a defect |
| TASK-030 | 2 | APPROVED | 2026-09-11 | R2-M1 F-03c absent (AC-P16 still unevidenced); R2-L1 one-site tie-break regression invisible; R2-L2 stale phase-1 comment |
| TASK-010 | 2 | APPROVED | 2026-09-11 | H-2 superseded (PO 2004 >= 1900); M-5 closed by denylist; ENGL 170R PO retains both attrs |
| TASK-011 | 2 | APPROVED | 2026-09-11 | H-3 closed (7 shapes, Unclassified 0); H-4 rescoped to PO; H-6 recorded as open question D-12 |
| TASK-012 | 2 | APPROVED | 2026-09-11 | H-5 closed by AC-B04 amendment (SP2027 unpublished upstream); L-7 codes now reported |
| TASK-013 | 2 | APPROVED | 2026-09-11 | M-4 closed; AC-B07 UNVERIFIABLE — no git remote (D-12), not ticked |
| — | — | FINDING | 2026-09-11 | R2-M2 docs/tasks/*.md merge=union silently dropped backend's REVIEW status; third instance of cross-branch declaration loss |
