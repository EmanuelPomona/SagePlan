# STATUS: agent/frontend
Task: TASK-020 (engine) — then 021, 022, 023, 024, 025
Round: 0
Last updated: 2026-09-08T20:32:34Z

## Skills invoked so far
- superpowers:verification-before-completion @ round-0 blocked record -> forced
  mechanical proof of every claim; caught 3 sub-checks that silently failed on
  macOS (`cat -A` is GNU-only) and a skill I had listed as invoked when it was
  only preloaded.

## Unblocked (was BLOCKED round 0)
The manager landed the plan in 5c3d4e8, merged to this branch in 8db0aec. All
four round-0 blockers are cleared, verified by reading the files:
- brief -> DESIGN_BRIEF.md now names 3 reference points (Tufte sidenotes, printed
  transcript, Hyperschedule), a 3-face type pairing with reasoning, a 10-role
  semantic palette with light+dark, a signature element (margin of evidence +
  term ribbon), and a 4-part anti-character.
- task -> 6 tasks own `frontend`: TASK-020..025, chain 020 -> 021 -> 022 ->
  {023 -> 024, 025}.
- architecture -> React 19 + Vite 7 + TS strict, no router, npm workspaces.
- product -> PRODUCT.md and ACCEPTANCE.md are concrete (AC-P01..AC-D03).

## Dependencies verified present
- packages/shared (the contract, manager-owned, TASK-001 DONE) -> 9 modules read
- data/programs/general-education-2026.json -> 18 requirements, 1 constraint
  (distinctDepartments over area-1..area-6), 7 advisories
- data/external-credit-rules.json -> 83 subjects, 8 rules, caps {AS 2, ext 16}
- NOT present: data/catalog.json (backend TASK-010). Engine takes catalog as a
  parameter, so TASK-020 is unaffected; TASK-021 data loading will need it.

## In progress
- [ ] TASK-020 packages/engine. Next: scaffold package, then TDD in the task's
      stated order (filters -> attribute -> credits -> gpa -> externalCredit ->
      assignment -> golden).

## Done
- [x] Confirmed branch `agent/frontend`; read CLAUDE.md, AGENT_PROTOCOL.md,
      SKILL_ROUTING.md, DESIGN_CONSTRAINTS.md, DESIGN_BRIEF.md, PRODUCT.md,
      ARCHITECTURE.md, API.md, ACCEPTANCE.md, TASK-020..025, packages/shared/src

## Verified
- (round 0 evidence retained in git history at 88133f2)

## Blocked on
- nothing
