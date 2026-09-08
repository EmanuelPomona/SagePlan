---
id: TASK-002
title: Encode General Education 2026-27 and external credit rules as data with verbatim quotes
status: DONE
owner: manager
branch: main
priority: HIGH
round: 0
depends_on: [TASK-001]
blocked_on: ""
---

# TASK-002 — GE program and external credit rules

## Objective

`data/programs/general-education-2026.json` and `data/external-credit-rules.json`,
every `sourceQuote` a verbatim substring of a snapshot in
`data/sources/catalog-pages/`. Done in the planning session by the manager.

## Scope

- `data/programs/general-education-2026.json`
- `data/external-credit-rules.json`
- `data/sources/catalog-pages/*.txt`, `index.json`

## Acceptance Criteria

- [x] `npx tsx packages/shared/scripts/validate-artefacts.ts` reports both files valid and 0 quote failures
- [x] 18 requirements (two PE and two post-matriculation variants gated by `appliesWhen.studentType`), 1 `distinctDepartments` constraint, 7 advisories
- [x] Requirements whose interpretation is unconfirmed carry `confidence: draft` (`area-6`, `post-matriculation-credits-transfer`, `pomona-residency-credits`)

## Notes

Findings that corrected the brief are recorded in `docs/DECISIONS.md` ADR-007.
Open item for the owner: confirm the three `draft` interpretations and the
A-Level credit cutoff with the Registrar.

## Review History

| Round | Verdict | Summary |
|---|---|---|
