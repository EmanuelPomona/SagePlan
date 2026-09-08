---
id: TASK-090
title: P0 acceptance review — all criteria, privacy audit, engine golden review
status: BACKLOG
owner: reviewer
branch: agent/reviewer
priority: HIGH
round: 0
depends_on: [TASK-013, TASK-025]
blocked_on: ""
---

# TASK-090 — P0 acceptance review

## Objective

After integration, verify every criterion in `docs/ACCEPTANCE.md` with the
evidence it names, independently of the workers' handoffs. Gate the release.

## Scope

- `docs/review/R-*.png`, `R-console.txt`, `R-network.txt`
- `docs/DEBT.md` (accepted findings)
- verdicts in each task's Review History

## Acceptance Criteria

- [ ] Every AC-* in `docs/ACCEPTANCE.md` has a checked box with a pointer to its evidence, or an explicit BLOCKED reason.
- [ ] The privacy check (AC-P07) was performed by the reviewer, not copied from the frontend handoff.
- [ ] Every engine golden file was read against the "Must show" column; disagreements filed as findings.
- [ ] `scripts/audit-skills.sh` run for both worker worktrees; fabricated skill claims recorded as CRITICAL.
- [ ] Verdict issued per protocol §11.

## Notes

Skills: `ecc:browser-qa`, `frontend-design:frontend-design`,
`ui-ux-pro-max:ui-ux-pro-max`, `ecc:make-interfaces-feel-better` for the
visual review; `ecc:security-review` for the share-link import; visual
findings are advisory (protocol §11).

## Review History

| Round | Verdict | Summary |
|---|---|---|
