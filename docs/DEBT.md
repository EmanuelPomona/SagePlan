# Accepted Debt

Findings the reviewer accepted rather than blocking on, and protocol violations
recorded during integration.

Nothing is deleted from this file during a project. It is an input to
`docs/RETRO.md` at the end.

| Date | Task | Severity | Finding | Why accepted |
|---|---|---|---|---|

## From Round 2 (2026-09-11) — unverifiable, not failed

| ID | Task | Kind | Finding | Measurement | Suggested fix |
|---|---|---|---|---|---|
| D-11 | TASK-013 | UNVERIFIED | AC-B07 (the nightly workflow opens a PR) has never executed anywhere. | `git remote -v` is empty on 2026-09-11: the repository exists only on this machine. `actionlint` and `act` are absent, so only YAML validity and structure could be checked. | **Owner action:** create the GitHub remote and push. Until then the reviewer records BLOCKED on AC-B07 rather than APPROVED (ADR-020). |
| D-12 | TASK-011 | OPEN QUESTION | `Measure Values = 2` on nineteen Physical Education rows: verified to exist, meaning unknown. | A literal `=== "1"` pivot yields PE 222; the `>= 1` rule yields the expected 241. | Ask the Registrar what `2` means. If it means "counts as two PE courses", add the optional `attributeWeights` field backend proposed - additive, no `schemaVersion` bump (ADR-020). |
