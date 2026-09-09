---
id: TASK-024
title: "What satisfies this?" — candidates filtered to an upcoming term, dual-purpose marking, term ribbon
status: DONE
owner: frontend
branch: agent/frontend
priority: HIGH
round: 1
depends_on: [TASK-023]
blocked_on: ""
---

# TASK-024 — "What satisfies this?" (the wedge feature)

## Objective

Inside an expanded unmet or partial requirement, list the courses that would
close it, filtered to those with a section in the selected upcoming term
(`manifest.upcomingTerms`), marking any candidate that also closes another
open requirement ("also closes: Area 3"), and drawing each course's **term
ribbon** (last eight terms, filled where it ran) from offering history. Section
and history data load lazily on first open, with a specific state when they are
unavailable.

## Scope

Create only:

```
apps/web/src/candidates/WhatSatisfies.tsx    replaces <WhatSatisfiesSlot>; term <select> from manifest.upcomingTerms (default first); "show all catalog candidates" toggle; count line "12 of 307 Area 5 courses are offered in SP 2027"
apps/web/src/candidates/CandidateRow.tsx     code (mono), title, attribute chips, section summary (instructors, seats filled/total, status), "also closes: …" line in --satisfied when dual purpose, <TermRibbon/>, link "Open in Hyperschedule" (https://hyperschedule.io/?…) with rel=noopener
apps/web/src/candidates/TermRibbon.tsx       eight cells, labels FA/SP + 2-digit year, filled/hollow, aria-label "offered in 5 of the last 8 terms: FA24, SP25, …"
apps/web/src/candidates/selectors.ts         offeredIn(candidates: CourseId[], sections: Section[]): Map<courseKey, Section[]>;  dualPurpose(course: CourseId, results: Result[], currentRequirementId: string): string[] /* requirement ids */;  ribbon(course: CourseId, history: OfferingHistory[], knownTerms: TermId[], n = 8): { term: TermId; offered: boolean }[]
apps/web/src/data/useLazyData.ts             useSections(term: TermCode), useHistory(): { status: "idle" | "loading" | "ready" | "error"; value?; error? } using loadSections/loadHistory from TASK-021, cached per term
apps/web/src/test/selectors.test.ts
```

## Interfaces

**Consumes:** `Result.candidates` (engine), `useAudit()`, `useData()`
(`manifest.upcomingTerms`), `loadSections`, `loadHistory` (TASK-021),
`buildCourseIndex` (TASK-022) for titles, `courseKey`, `termCode`,
`compareTerms` from shared.

**Produces:** nothing consumed by other tasks.

## Tests to write first

1. `selectors.test.ts`: `offeredIn` keeps only candidates with ≥ 1 section in the term; `dualPurpose` returns other unmet/partial requirement ids whose candidates include the course and excludes the current one and satisfied ones; `ribbon` returns exactly `n` entries aligned to the last `n` `knownTerms`, ascending, with `offered` true where history lists the term; a course absent from history yields all-hollow, never throws.

## Acceptance Criteria

- [ ] AC-P03: screenshot `R-04-what-satisfies.png` (frontend's `F-04-what-satisfies.png`) with the term filter on, at least one dual-purpose mark, and ribbons.
- [ ] AC-U02: every candidate row has a ribbon.
- [ ] Term-data-unavailable state: with the sections file for the chosen term removed from dev-fixtures, the list shows "Section data for SP 2027 is not available; showing all catalog candidates" and still lists candidates. Screenshot `F-NN-state-term-unavailable.png`.
- [ ] Loading state on first open screenshotted.
- [ ] Empty state: a requirement whose candidates have no sections this term shows "None of the n courses that satisfy this are offered in SP 2027" with the show-all toggle.
- [ ] At 390 candidates stack with the ribbon beneath each course; the ribbon stays legible (≥ 12px cells).
- [ ] The Hyperschedule link is the only external link and is attributed; no request to hyperschedule.io is made by the page (`F-network.txt`).
- [ ] `typecheck`, `lint`, `test`, `build` pass; console clean.

## Notes

- Skills: `ecc:react-performance` (memoise `offeredIn` per term; candidate lists can be 900 courses before filtering), `ecc:frontend-a11y` (ribbon aria-label), `ecc:make-interfaces-feel-better`, `ecc:browser-qa`, `superpowers:requesting-code-review`, `superpowers:verification-before-completion`.
- The ribbon is the product's most differentiated asset made visible (brief §7B). Make it read at a glance: filled cells in --ink, hollow cells as hairline squares, no color coding.
- Do not build a timetable. Link out.

## Review History

| Round | Verdict | Summary |
|---|---|---|
| 1 | APPROVED | Approved. Candidate list, upcoming-term filter and the term ribbon verified live (108 of 190 offered in FA 2026). |
