---
id: TASK-032
title: Record v1 — codes are the only required input, collapsed record, transcript paste
status: REVIEW
owner: frontend
branch: agent/frontend
priority: HIGH
round: 0
depends_on: [TASK-030, TASK-031]
blocked_on: ""
---

# TASK-032 — Record v1 and transcript paste

## Objective

Make entering a record cost almost nothing. The owner's words: *"People don't
wanna search up every class and manually select classes and grades and stuff."*

Three changes:

1. **Course codes are the only required input** (ADR-015). Term, grade and
   "Taken at" move behind a per-row `edit` disclosure. The default row is code,
   title, and remove. Provenance is inferred from the campus code in the id
   (`PO` -> `pomona`; `HM`/`SC`/`CM`/`PZ` and the other 5C codes -> `claremont`;
   `EXT` -> asks). Term and grade default to `null`, which the engine now
   handles honestly.
2. **The profile stops asking when you matriculated.** `matriculationTerm` is
   inferred by the engine from the earliest known course term. Keep the student
   type control (first-year / transfer) — it is one toggle and genuinely changes
   which requirements apply. Show the inferred term as correctable text
   ("Entered Fall 2025 — change"), not as two dropdowns.
3. **The record collapses to one line** once it holds a course: `32 courses ·
   30.5 credits · entered Fall 2025   [ edit ]`. This is what puts the map above
   the fold in TASK-033. It expands to the full entry surface on click, and
   starts expanded when the record is empty.

Plus the entry surface itself: **transcript paste** (ADR-012).

## Scope

```
apps/web/src/record/RecordSection.tsx        collapsed summary <-> expanded entry surface
apps/web/src/record/RecordSummary.tsx        NEW. the one-line collapsed state
apps/web/src/record/CourseTable.tsx          default row = code, title, remove; per-row `edit` disclosure holds term, grade, taken-at, and "I did not pass this"
apps/web/src/record/ProfileFields.tsx        student type only; inferred term shown as correctable text
apps/web/src/record/inferProvenance.ts       NEW. provenanceFor(courseId): Provenance
apps/web/src/transcript/parseTranscriptText.ts  NEW. the tolerant parser (below)
apps/web/src/transcript/TranscriptPaste.tsx     NEW. textarea -> preview (accepted / rejected with reasons) -> Add n courses
apps/web/src/record/parsePaste.ts            keep for tidy spreadsheet rows, or fold into the transcript parser if it subsumes it cleanly; do not maintain two parsers that disagree
apps/web/src/test/{parseTranscriptText,inferProvenance,RecordSummary}.test.ts
```

## `parseTranscriptText` — the contract

```ts
parseTranscriptText(text: string, index: CourseIndex): {
  rows: CompletedCourse[];                                    // term/grade null when not found
  rejected: { line: number; text: string; reason: string }[];
  detected: { terms: boolean; grades: boolean };              // drives the preview's wording
}
```

It takes an arbitrary blob, not tidy rows. It must find a course code anywhere
in a line, attach a term if one appears on that line **or in the nearest
preceding term heading** (transcripts group courses under "Fall 2025"), and
attach a grade if one appears on the line. Anything it cannot place is
`rejected` with a reason naming the field. It never throws, and it never adds
anything the student has not seen.

Shapes it must handle, each as a test:

```
CSCI 051 PO                                     bare code
CSCI051 PO  Introduction to Computer Science  1.00  A      transcript-ish row
Fall 2025                                       term heading, applies to lines under it
  CSCI 051 PO   Intro to CS            A
  MATH 030 PO   Calculus I             B+
CSCI 051 PO, Fall 2025, A-                      comma separated
CSCI 051 PO	FA2025	A-                          tab separated
```

Terms: `FA2025`, `Fall 2025`, `F25`, `SP2026`, `Spring 2026`, `S26`, and a bare
`2025-26 Fall`. Grades: the grade select's values, case-insensitive, plus `CR`,
`P`, `NC`, `NP`, `IP`, `W`.

**Do not build the PDF tier in this task.** ADR-012 defers it until the owner
supplies a real transcript at `data/sources/samples/` (gitignored). If you
finish early, the useful preparation is making `parseTranscriptText` take text
from any source and proving it on hand-typed blobs.

## Interfaces

**Consumes:** `usePlan()`, `buildCourseIndex` / `search` (TASK-022), the
nullable `CompletedCourse` from `@sageplan/shared`.

**Produces:** `parseTranscriptText`, `provenanceFor`, `RecordSummary` (consumed
by `Page.tsx` in TASK-033).

## Tests to write first

1. `parseTranscriptText.test.ts` — every shape above; a term heading applying to the three lines beneath it and stopping at the next heading; a line with a code and an unparseable grade rejected naming the grade; a duplicate of an existing plan course rejected with "already in your record"; a 200-line blob with page headers, "UNOFFICIAL TRANSCRIPT", GPA lines and page numbers yielding only the courses.
2. `inferProvenance.test.ts` — `PO` -> pomona; `SC`, `CM`, `HM`, `PZ` -> claremont; `EXT` -> the form asks.
3. `RecordSummary.test.ts` — credits total counts catalog credits and per-course overrides; collapsed by default with >= 1 course; expanded when empty.

## Acceptance Criteria

- [ ] AC-V06 and AC-V07 in `docs/ACCEPTANCE.md`, with the preview screenshot and the parser tests.
- [ ] A plan built only from pasted codes — no term, no grade, no provenance touched — produces an audit identical to the same plan with terms and grades, except where `docs/API.md` 2.7 requires `unverifiable`. Prove it with fixture F-13 and a screenshot of both.
- [ ] The profile has no term dropdowns. The inferred term appears as text with a way to correct it. Evidence: screenshot.
- [ ] The record collapses to one line with a course present and expands on click; empty state still opens expanded. Evidence: two screenshots.
- [ ] Entering 30 courses by paste takes one paste and one confirm. Time it and put the number in the handoff.
- [ ] Interface states for this section: default, hover, focus, active, disabled, error (rejected rows), empty. Screenshots.
- [ ] At 390px the collapsed summary stays one line and the expanded table stays within the viewport (no repeat of M-07).
- [ ] `npm run typecheck`, `lint`, `test`, `build` pass; console clean.

## Notes

- Skills: `superpowers:test-driven-development` before the parser (it is the highest-risk logic in the app after the engine — a transcript parsed subtly wrong is worse than one not parsed), `ecc:frontend-a11y` for the disclosure semantics, `ecc:make-interfaces-feel-better`, `ecc:browser-qa`, `superpowers:requesting-code-review`, `superpowers:verification-before-completion`.
- The preview is load-bearing: it is the only thing standing between a tolerant parser and silently wrong data. Show what was parsed **and** what was skipped, and never add on paste alone.
- Say "assumed passed" on the record where grades are absent, and offer "I did not pass this" per row. A student who failed a course and says nothing gets it counted, and they should be told that once, plainly.

## Review History

| Round | Verdict | Summary |
|---|---|---|
