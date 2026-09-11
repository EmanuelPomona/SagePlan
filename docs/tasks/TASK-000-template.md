---
id: TASK-000
title: Task name
status: BACKLOG        # BACKLOG | READY | IN_PROGRESS | BLOCKED | REVIEW | DONE
owner: frontend        # frontend | backend | <slice-id>
branch: agent/frontend
priority: HIGH         # HIGH | MEDIUM | LOW
round: 0               # incremented by the reviewer on each verdict
depends_on: []
blocked_on: ""         # contract | brief | credential | <task-id>
---

# TASK-000 — Task name

## Objective

Exactly what must be accomplished. Specific enough that the owner never needs to
ask the manager a question.

## Scope

Files and directories this task may touch. Two tasks should not list the same file.

## Acceptance Criteria

Checkable by someone who did not build it.

- [ ]
- [ ]

## Notes

Relevant implementation information, links to the contract sections involved.

**Notes are guidance, not requirements.** Anything that must be true for the task
to be done belongs in Acceptance Criteria, where it gets ticked. A requirement
recorded only here is a requirement recorded where the person ticking boxes does
not read it — which is how F-03c was specified, agreed and then missed
(reviewer R2-M1, 2026-09-11). If you find yourself writing "must" or "required"
in this section, it belongs above.

## Review History

| Round | Verdict | Summary |
|---|---|---|
