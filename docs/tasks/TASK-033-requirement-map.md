---
id: TASK-033
title: Requirement map — twelve nodes in three families above the fold, denser audit, quotes on expand
status: REVIEW
owner: frontend
branch: agent/frontend
priority: HIGH
round: 0
depends_on: [TASK-030, TASK-031, TASK-032]
blocked_on: "contract (AC-V09 second clause only; see handoff CCR)"
---

# TASK-033 — The requirement map

## Objective

The headline v1 change. The owner: *"Scroll down to see area requirements ->
bad. Animation or visual of all areas together to see more clearly and easily."*
The reviewer measured it: the audit is **1774px at 1440x900** with 57px rows.

Build the map specified in `docs/DESIGN_BRIEF.md` -> Structural rule: twelve
nodes in three families (Breadth 6 / Overlays 3 / Foundations 3), each showing
its state and the course that satisfied it, sitting above the detail rows and
visible without scrolling. Administrative requirements get a one-line strip.
Clicking a node opens that requirement's row below.

The owner's reference image is committed at
`docs/design-refs/v1-requirement-map-reference.png`. Take the node grammar (a
ring per requirement, state shown by how the ring is filled), the family
grouping, and the warm light ground. **Do not** take the four-year planner, the
prerequisite arrows, "Unlocks", or the major tree — they are P1/P2 and building
them would change what this product is. Its "Area 1-5" is wrong; Pomona has six.

Two smaller changes in the same pass, both from owner feedback:

- **The verbatim quote moves into the expanded row** (ADR-011). Collapsed rows
  become one line each. This is roughly half the height problem.
- **The advisories section leaves the page body.** The owner: *"You can remove
  the 'not checked here' section."* Each advisory that belongs to a requirement
  moves inside that requirement's expanded row; the rest, including the 2.00 GPA
  sentence, live behind one collapsed `Other degree rules (n)` line in the
  footer. Nothing is deleted — the College's words stay reachable.

## Scope

```
apps/web/src/map/RequirementMap.tsx     the three families, the bracket, the nodes
apps/web/src/map/RequirementNode.tsx    button; ring grammar per the brief; label; course or count beneath
apps/web/src/map/families.ts            FAMILIES: the id -> family mapping and its order (Breadth / Overlays / Foundations); ADMINISTRATIVE: the ids that get the strip
apps/web/src/map/AdministrativeStrip.tsx  "32 of 32 credits · 16 at Pomona · 30 after matriculation  [details]"
apps/web/src/audit/AuditSection.tsx     render the map, then the rows; wire node -> row expansion + scrollIntoView
apps/web/src/audit/RequirementRow.tsx   collapse to one line; quote moves into the detail
apps/web/src/audit/RequirementDetail.tsx  gains the verbatim quote in its margin, and any advisory belonging to this requirement
apps/web/src/audit/Advisories.tsx       becomes the footer's collapsed "Other degree rules (n)"
apps/web/src/layout/Page.tsx            band order: masthead, RecordSummary, map, rows, footer
apps/web/src/test/{families,RequirementMap}.test.ts
```

## Node grammar (from the brief, restated so you do not have to switch files)

| State | Ring | Under the label |
|---|---|---|
| satisfied | filled, check inside | the course, in mono (`ENGL 067`) |
| partial | half-filled | `0.5 of 1`, `1 of 2` |
| unmet | hollow, solid ring | `2 in SP27` — candidates offered next term |
| unverifiable | hollow, **dashed** ring | the one thing that would resolve it |
| manual (override / attested) | filled, plum, different glyph | `override` or `attested` |

Waived requirements (`waived: true`) are **not** nodes. They appear last in the
detail rows.

## Interfaces

**Consumes:** `useAudit()` (`Result[]`), `useData()` (the `Program` for labels,
`manifest.upcomingTerms` for the "in SP27" counts), `RecordSummary` from
TASK-032.

**Produces:** nothing other tasks consume.

## Tests to write first

1. `families.test.ts` — every requirement id in `general-education-2026.json` is either in a family or in `ADMINISTRATIVE`, with **no id unaccounted for**; the transfer PE variant lands in Foundations; exactly twelve nodes for a `firstYear` student and twelve for a `transfer` student (the PE variant swaps in, the waived one drops out).
2. `RequirementMap.test.ts` — a satisfied node renders its course code; an unmet node renders the offered-count; an unverifiable node renders the resolving prompt; a waived requirement renders no node; each node is a `button` with an `aria-label` naming requirement, status and next action.

## Acceptance Criteria

- [ ] AC-V01, AC-V02, AC-V03, AC-V04, AC-V09, AC-V10, AC-V11 in `docs/ACCEPTANCE.md`, each with the evidence it names.
- [ ] **AC-V02 is a measurement, and the instrument is part of it** (ADR-017, amended after the reviewer flagged the ambiguity): a **1440x800 viewport** set with CDP `Emulation.setDeviceMetricsOverride`, never a window resize, with `window.innerWidth`/`innerHeight` read back from the page and pasted as proof. A macOS window resized to 1440x1000 reports `innerHeight` 823, so "1440x900" measured as a window is a different and stricter test than measured as a viewport. 800 is the target because a 1440x900 display leaves roughly 765-800px of viewport after the menu bar and browser chrome — the owner's actual laptop is the only place this matters.
- [ ] **AC-V03 is a measurement:** paste the measured height of a collapsed row (target <= 40px, was 57) and of the map (target <= 320px).
- [ ] AC-P02 still holds: the verbatim quote is one click from every claim, in the expanded row.
- [ ] Responsive: at 768 the three families stack two-up or wrap sensibly; at 390 they stack in one column and every node stays >= 44px in its tappable dimension. Screenshots at all three widths.
- [ ] The only motion is the row expansion (about 180ms ease-out) and it respects `prefers-reduced-motion`. The owner asked for "animation or visual"; the visual is the map, and motion beyond the expansion has to earn itself (`docs/DESIGN_CONSTRAINTS.md` 22).
- [ ] `npm run typecheck`, `lint`, `test`, `build` pass; console clean; `scripts/slop-check.sh apps packages` run and every hit removed or justified in the brief.

## Notes

- Skills, in order: `frontend-design:frontend-design` and `ui-ux-pro-max:ui-ux-pro-max` before laying the map out, then `design-taste-frontend` as the anti-generic critique of what you produced (this is the page's new centrepiece — the critique is not optional), `ecc:frontend-a11y` for the node semantics and the roving-focus question, `ecc:make-interfaces-feel-better` after the structure is right, `ecc:browser-qa`, `superpowers:requesting-code-review`, `superpowers:verification-before-completion`.
- The map is a **diagram, not a dashboard**. No percentage, no donut, no stat tiles (`docs/DESIGN_CONSTRAINTS.md` 21). If it starts to look like an analytics panel, the reference image is the corrective: it reads as a study aid.
- Twelve nodes is small. Resist a grid library, resist virtualisation, resist a chart dependency. This is layout and SVG or CSS.
- If the map cannot be made to fit above the fold at 1440x900 without shrinking type below the brief's scale, stop and say so in the handoff rather than shipping 11px labels. That is a design problem for the manager, not a thing to solve by compression.

## Review History

| Round | Verdict | Summary |
|---|---|---|
