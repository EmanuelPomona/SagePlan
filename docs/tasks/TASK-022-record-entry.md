---
id: TASK-022
title: Record section — profile, course autocomplete, spreadsheet paste, non-catalog courses, external credit entry
status: DONE
owner: frontend
branch: agent/frontend
priority: HIGH
round: 1
depends_on: [TASK-020, TASK-021]
blocked_on: ""
---

# TASK-022 — Record section (course entry)

## Objective

The highest-friction moment in the product (brief §10). Implement the "Your
record" section: profile (matriculation term, student type), a keyboard-first
course autocomplete over the whole catalog, a paste importer with preview, a
form for courses not in the catalog (transfer, non-Pomona abroad), and external
credit entry that shows what each exam resolved to. Every change flows through
`usePlan()` and re-evaluates the audit immediately.

## Scope

Create only:

```
apps/web/src/record/RecordSection.tsx        (replace the TASK-021 placeholder) layout: profile line, search input, course table, paste, external credits
apps/web/src/record/ProfileFields.tsx        term picker (season + year), student type toggle; changing either re-evaluates
apps/web/src/record/courseIndex.ts           buildCourseIndex(courses: Course[]): CourseIndex; search(index, query: string, limit = 8): Course[]   ranking: exact courseKey prefix > department+number prefix > title token prefix > title substring; ties by courseKey
apps/web/src/record/CourseSearch.tsx         ARIA combobox (role=combobox, aria-expanded, aria-activedescendant, listbox); opens on first keystroke; ↑↓ Enter Esc; each option shows code (mono), title, GE attribute chips; Enter adds with term = most recent term in the plan or matriculation term, grade "" (prompt inline), provenance from affiliation (PO→pomona, other 5C→claremont)
apps/web/src/record/CourseTable.tsx          rows: code, title, term, grade (select: A…F, CR, P, NC, NP, IP), provenance (select), remove; inline edits call updateCompleted; a course not found in the catalog shows a "not in catalog" mark
apps/web/src/record/parsePaste.ts            parsePaste(text: string, index: CourseIndex, defaults: { term: TermId }): { rows: CompletedCourse[]; rejected: { line: number; text: string; reason: string }[] }
apps/web/src/record/PasteImport.tsx          textarea → preview table (accepted / rejected) → "Add n courses"; never adds silently
apps/web/src/record/NonCatalogCourseForm.tsx code (department, number, suffix; affiliation fixed EXT), title, credits, term, grade, provenance (transfer | abroad), attributes checklist enabled only for provenance transfer and studentType transfer
apps/web/src/record/ExternalCreditEntry.tsx  subject <select> grouped by kind from rules.subjects; score / grade / level inputs shown per kind; on add: resolveExternalCredit → show "1 credit, grants Language" or the notes explaining why not; list with remove
apps/web/src/test/{courseIndex,parsePaste}.test.ts
```

## Interfaces

**Consumes:** `usePlan()` and `useData()` from TASK-021 (exact API in that task);
`resolveExternalCredit` from `@gradguide/engine`; `parseCourseKey`, `courseKey`,
`parseTermCode`, `LETTER_GRADE_ORDER` from shared.

**Produces:** `buildCourseIndex` / `search` (TASK-024 reuses the index for
candidate titles); `parsePaste`.

## Paste shapes to accept (tab or comma separated, one course per line, header line optional)

```
CSCI 051 PO
CSCI 051 PO	FA2025
CSCI 051 PO	FA2025	A-
CSCI051 PO, Fall 2025, A-
```

Term parsing accepts `FA2025`, `Fall 2025`, `F25`, `SP2026`, `Spring 2026`,
`S26`. Grade parsing accepts the grade select's values case-insensitively.
Anything else is rejected with a reason naming the field.

## Tests to write first

1. `courseIndex.test.ts`: `"csci 5"` ranks `CSCI 051 PO` before `CSCI 005 HM`?? No: prefix match on `CSCI 005` should rank higher than `051`; write the ranking rules as tests and make them pass; `"intro comp"` matches by title tokens; results limited to 8; `"ID 1"` finds `ID 001 PO`.
2. `parsePaste.test.ts`: each shape above; header line skipped; unknown code rejected with reason "not in catalog"; bad term rejected naming the term; blank lines ignored; duplicate of an existing plan course flagged in `rejected` with reason "already in your record".

## Acceptance Criteria

- [ ] AC-F02: autocomplete behaviour as specified, keyboard-only transcript pasted into the handoff; screenshot with popover open (`F-NN-state-autocomplete.png`).
- [ ] AC-F03: paste preview screenshot; parser tests pass.
- [ ] AC-F04: profile and exam entry; a screenshot showing an AP Spanish 5 resolving to "1 credit, grants Language" and an IB Spanish B SL 7 resolving to "no credit; Language B Standard Level does not satisfy the language requirement".
- [ ] Non-catalog transfer course with attributes for a transfer student appears in the audit as satisfying its area (verify with `useAudit`).
- [ ] Interface states for this section: default, hover, focus, active, disabled (Add disabled with empty input), error (rejected paste rows) screenshotted.
- [ ] Responsive: at 390 the table becomes a two-line list (code + title / term + grade + provenance).
- [ ] `typecheck`, `lint`, `test`, `build` pass at root.

## Notes

- Skills: `ecc:frontend-a11y` before the combobox (it is the hardest a11y piece in the app); `vercel:react-best-practices`, `ecc:react-performance` (index built once, search memoised, list virtualisation NOT needed at 8 results); `ecc:make-interfaces-feel-better` after structure; `ecc:browser-qa`, `superpowers:requesting-code-review`, `superpowers:verification-before-completion`.
- A student's spreadsheet is the competitor: entering 32 courses must take under three minutes with the keyboard.
- Real content: use real course codes and titles in screenshots, never "Course 1".

## Review History

| Round | Verdict | Summary |
|---|---|---|
| 1 | APPROVED | Approved. Advisory only: M-7 at 390px the 541px exam select expands the layout viewport to 595px. Moved to DEBT.md. |
