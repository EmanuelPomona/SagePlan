---
id: TASK-023
title: Audit section — requirement rows with four states, margin of evidence, in-place detail, overrides and attestations
status: READY
owner: frontend
branch: agent/frontend
priority: HIGH
round: 0
depends_on: [TASK-020, TASK-022]
blocked_on: ""
---

# TASK-023 — Audit section (dashboard + requirement detail)

## Objective

Render `useAudit()` as the document described in `docs/DESIGN_BRIEF.md`:
grouped requirement rows, each with verdict glyph, label, status word, the
satisfying course(s) in mono, remaining or candidate counts, and the verbatim
`sourceQuote` in the margin (the signature element). A row expands **in place**
to the requirement detail: full quote, the tool's explanation, the rule in
plain English, encoding confidence when not `verified`, override and
attestation controls, and a slot for "What satisfies this?" (TASK-024).
Overrides, attestations and waivers render as manual results in plum. No
percentage anywhere.

## Scope

Create/modify only:

```
apps/web/src/audit/AuditSection.tsx      (modify) groups + summary line ("4 of 6 breadth areas · 2 overlays owed · Language satisfied by exam") + advisories block
apps/web/src/audit/groupRequirements.ts  groupRequirements(program: Program, results: Result[], plan: StudentPlan): Group[]  groups: Foundations [critical-inquiry], Breadth [area-1..6], Overlays [writing-intensive, speaking-intensive, analyzing-difference], Language, Physical Education, Credits [total-credits, post-matriculation*, pomona-residency-credits], Grade Point Average; within a group unmet → partial → unverifiable → satisfied; waived rows last; requirements whose appliesWhen excludes the student are hidden except the waived CI row
apps/web/src/audit/RequirementRow.tsx    the two-column line; left: glyph, label, status word, satisfiedBy as course chips (mono) or "n courses could satisfy this" / "n more needed"; right: sidenote = sourceQuote (serif 13px) or, when unverifiable, the prompt; when override, "override · approved by X"; button to expand; row carries data-status
apps/web/src/audit/RequirementDetail.tsx full quote + link to sourceRef.url, explanation, ruleToProse(rule), confidence badge (draft/unverified), courses counted, OverrideForm, AttestationControl, <WhatSatisfiesSlot/>
apps/web/src/audit/ruleToProse.ts        ruleToProse(rule: Rule, ctx: { catalog: Course[] }): string   ("One course tagged Area 3, taken at the Claremont Colleges." / "32 course credits, counting at most 2 from exams." / "GPA of at least 2.00 over letter-graded courses.")
apps/web/src/audit/OverrideForm.tsx      course search (reuse CourseSearch in a compact mode) + reason + approvedBy → addOverride; list existing with remove
apps/web/src/audit/AttestationControl.tsx checkbox with the requirement's attestable.prompt → setAttestation
apps/web/src/audit/Advisories.tsx        program.advisories as a quiet list with their quotes in the margin
apps/web/src/audit/ProgressCount.tsx     "4 of 6" bar, used ONLY where a count is real (breadth group header, PE row)
apps/web/src/test/{groupRequirements,ruleToProse}.test.ts
```

## Interfaces

**Consumes:** `useAudit()`, `usePlan()`, `useData()` from TASK-021;
`CourseSearch` + `buildCourseIndex` from TASK-022; `Result`, `Program`,
`Requirement`, `Rule` from shared; `EXAM_PSEUDO_ID` from the engine (render as
the exam label from `plan.externalCredits`).

**Produces:** `<WhatSatisfiesSlot requirementId>` placeholder that TASK-024
replaces; `data-status` attribute on rows for the reviewer's screenshots.

## Tests to write first

1. `groupRequirements.test.ts`: the GE program yields the seven groups in order; unmet sorts before satisfied inside Breadth; for `studentType: transfer` the `physical-education` row is hidden and `physical-education-transfer` shown; the waived CI row is present and last in Foundations.
2. `ruleToProse.test.ts`: one sentence per P0 rule kind including filter provenance and caps; deferred kinds → "Not checked in this version: <kind>".

## Acceptance Criteria

- [ ] AC-P01: with demo plan F-01 imported, every satisfied row names its course(s); screenshot `F-01-desktop-1440.png` shows it.
- [ ] AC-P02 / AC-U01: every row has its quote in the margin at 1440; at 768 it collapses beneath the row (one line, expands on tap); at 390 it is a disclosure. Three screenshots.
- [ ] AC-P04: an unverifiable row (empty plan GPA, or an unconfirmed attestable) is slate with a dashed border, glyph ◌, the word "unverifiable" and the prompt in the margin. `F-NN-state-unverifiable.png`.
- [ ] AC-P05: an override row is plum, labelled "override", shows approver; an attested row is plum, labelled "attested". Screenshot beside an automatic row.
- [ ] AC-P15: with two DANC courses only, one Breadth row shows the constraint note (from `Result.note`/`violations`).
- [ ] AC-F05: unmet/partial first in each group with counts visible unexpanded.
- [ ] AC-U04: no overall percentage; `ProgressCount` appears only on Breadth header and PE.
- [ ] Row expand transition ≈180 ms ease-out; nothing else animates.
- [ ] Interface states: hover/focus/active on rows and controls; disabled Add on empty override form; screenshots.
- [ ] `typecheck`, `lint`, `test`, `build` pass; console clean.

## Notes

- Skills: `frontend-design:frontend-design` and `ui-ux-pro-max:ui-ux-pro-max` were invoked in TASK-021 for the system; invoke `design-taste-frontend` again here as the critique of the audit layout (this is the page's core), `ecc:frontend-a11y` (expand/collapse semantics: button + aria-expanded + region), `ecc:make-interfaces-feel-better`, `ecc:browser-qa`, `superpowers:requesting-code-review`, `superpowers:verification-before-completion`.
- "Never show a bare checkmark." If a row has no course to name (waived), the margin must say why.
- Copy: no em dashes in UI strings; not "may contain errors".

## Review History

| Round | Verdict | Summary |
|---|---|---|
