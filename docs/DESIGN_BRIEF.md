# Design Brief — SagePlan

Written by the manager before frontend work begins. This is a product-specific
design problem, not a style instruction. Frontend reads this together with
`docs/DESIGN_CONSTRAINTS.md` (the only copy of the visual constraints) and
`docs/PRODUCT.md`.

---

## v1 revision — 2026-09-11

The v0 build shipped and was reviewed against real use. Four things changed, on
the owner's instruction. **Where this section and the original text below
disagree, this section wins.**

| Changed | Why |
|---|---|
| **A requirement map sits above the detail rows** | The audit measured **1774px at 1440x900** (reviewer finding M-06). "Where do I stand" required two viewports of scrolling. The map answers it above the fold. |
| **The verbatim catalog quote moves into the expanded row** | It was roughly half the audit's height. It is still one click from every claim, which keeps the trust argument, and the collapsed rows now fit. |
| **Light is the default canvas** | The dark canvas was the accident of a `System` default; the design was always drawn for cream. |
| **The GPA row is gone, and the app never asks for grades** | A share link carries the whole plan, so grades would travel to whoever receives it. The 2.00 rule stays on the page as a quoted advisory. |

The owner's reference for the map is committed at
`docs/design-refs/v1-requirement-map-reference.png`. Take from it: the node
grammar (a ring per requirement, state shown by how the ring is filled), the
grouping of requirements into families, and the warm light ground. **Do not**
take from it: the four-year planner, prerequisite arrows, "Unlocks", or the
major tree - those are P1/P2 and building them now would change what this
product is. Its "Area 1-5" is also wrong; Pomona has six.

---

## Target audience

A Pomona first- or second-year, the week before registration, at a desk or on a
dorm bed at 11pm with a laptop. Portal, Hyperschedule and a private spreadsheet
are open in other tabs. Registration opens at 6am and they have four candidate
courses for two slots. They are anxious about missing a requirement they will
only discover senior year, and they are suspicious of an unofficial tool that
could be wrong. Secondary situation: standing outside an advisor's office on a
phone, checking whether one course does double duty.

The interface must therefore do two things at once: **work as fast as the
spreadsheet it replaces**, and **earn trust line by line** by showing its
evidence rather than asking to be believed.

## Primary interface job

Turn "what do I still owe?" into a named list of courses I can take next term,
with the catalog's own words beside every answer.

## Structural rule (owner decision, 2026-09-08; layout revised 2026-09-11)

**One page.** No tabs, no routes, no landing page, no modal that hides the
audit. The layout is four bands: who this is and how fresh the data is, what
you told us, **where you stand**, and the evidence behind it.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ MASTHEAD   SagePlan · unofficial · Catalog 2026-27 · data as of …             │
│            "The Registrar's official audit is the source of truth. Confirm    │
│             with your advisor before registering."  → portal link             │
├──────────────────────────────────────────────────────────────────────────────┤
│ YOUR RECORD   32 courses · 30.5 credits · entered Fall 2025      [ edit ▾ ]   │
│               (collapsed to this one line as soon as a course exists;         │
│                expands to the entry surface: search, paste, transcript)       │
├──────────────────────────────────────────────────────────────────────────────┤
│ WHERE YOU STAND                                                               │
│                                                                               │
│  BREADTH ──────────────────────   OVERLAYS ─────────   FOUNDATIONS ────────   │
│   ● Area 1    ● Area 2    ● Area 3   ● Writing           ● Critical Inquiry   │
│     ENGL 067    PSYC 052    AMST 110   ENGL 067            ID 001             │
│   ○ Area 4    ● Area 5    ◐ Area 6   ○ Speaking          ● Language          │
│     2 in SP27   MATH 030    0.5 of 1   7 in SP27           AP Spanish         │
│                                      ● Analyzing         ◐ Physical Ed        │
│                                        AMST 110            1 of 2             │
│                                                                               │
│  32 of 32 credits · 16 at Pomona · 30 after matriculation       [ details ]   │
├──────────────────────────────────────────────────────────────────────────────┤
│ THE DETAIL   one line per requirement; open one for the College's own words   │
│  ○ Area 4   unmet   1 more course   2 offered in SP 2027            [ open ]  │
│    ▼ opened ───────────────────────────────────────────────────────────────   │
│      "Area 4: Physical and Biological Sciences"        ← verbatim, serif      │
│      One course in Area 4, taken at the Claremont Colleges.                   │
│      What satisfies this?  →  offered SP 2027, ribbon, "also closes …"        │
│      Record an override · I satisfied this another way                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ EXPORT · IMPORT · SHARE LINK     Other degree rules (8) ▾      Attribution    │
└──────────────────────────────────────────────────────────────────────────────┘
```

**The map is the answer; the rows are the evidence.** Clicking a node opens that
requirement's row below and scrolls it into view. Nothing navigates away, and
no overlay ever covers the audit.

### The three families

Twelve nodes, because twelve is what a student actually chooses courses for.

| Family | Requirement ids | Why it is a family |
|---|---|---|
| **Breadth** | `area-1` … `area-6` | six peer slots, one course each, mutually exclusive by department |
| **Overlays** | `writing-intensive`, `speaking-intensive`, `analyzing-difference` | the catalog's own word for them; they ride on top of a Breadth course |
| **Foundations** | `critical-inquiry`, `language`, `physical-education` (or `-transfer`) | specific things you must actually go and take |

Everything else - `total-credits`, `post-matriculation-credits`,
`pomona-residency-credits` - is **administrative**: it is about totals, it
resolves itself, and no student plans a semester around it. It gets the one-line
strip under the map, not a node. A requirement waived for this student
(`waived: true`) is not drawn as a node; it appears in the detail rows, last.

### Node grammar

State is carried by the ring, never by hue alone, and every node also carries
its status word in its detail row.

| State | Ring | Under the label |
|---|---|---|
| satisfied | filled, check inside | the course that did it, in mono (`ENGL 067`) |
| partial | half-filled | `0.5 of 1`, `1 of 2` |
| unmet | hollow, solid ring | `2 in SP27` - how many candidates are offered next term |
| unverifiable | hollow, **dashed** ring | the one thing that would resolve it |
| manual (override / attested) | filled, plum, different glyph | `override` or `attested` |

A node is a button: `aria-label` reads "Area 4, unmet, 1 more course, 2 offered
in Spring 2027", and it is reachable and operable by keyboard.

## Reference points

1. **Edward Tufte's sidenote layout** (*Beautiful Evidence*; the tufte-css
   convention). Borrowed quality: the evidence sits in the margin beside the
   claim, set smaller and in the source's own voice, never pushed to a footer or
   a tooltip. This product's whole trust argument is "here is the catalog
   sentence that made us say this," so the layout physically reserves a column
   for it.
2. **A printed academic transcript / the Registrar's paper degree checklist.**
   Borrowed quality: the document register. Ruled rows, one requirement per line,
   the satisfying course written into the blank in a fixed-width hand, cream
   letter paper, no decoration. It is a record, not a dashboard.
3. **Hyperschedule** (the 5C student-built schedule tool this app links to).
   Borrowed quality: density and speed. Keyboard-first course search that returns
   results as you type, light chrome, a page that feels like it was built by the
   students who use it. SagePlan should feel like Hyperschedule's sibling, not
   like a vendor product.

## Desired character

- **Documentary** → the audit reads like a record you could print and take to
  your advisor. Rows, rules, hairlines. No cards.
- **Evidential** → nothing is asserted without its source visible; every
  satisfied line names a course, every unmet line offers candidates, every rule
  shows its verbatim catalog sentence.
- **Dense** → a student with 32 courses and 15 requirements sees the whole
  picture in one viewport at 1440px. Whitespace is spent on separating sections,
  not on padding rows.
- **Honest about doubt** → `unverifiable`, `draft`, overrides and attestations
  look different from automatic results at a glance, not in a footnote.
- **Unofficial on purpose** → visibly a student tool. No College seal, no
  Pomona blue, no institutional tone. The disclaimer is specific and persistent.

## Anti-character

- Never a **SaaS analytics dashboard**: no KPI tiles, no donut chart, no "84%
  complete", no confetti, no streaks or badges. Progress bars appear only where a
  count is real ("4 of 6 breadth areas"), never for GPA or "overall".
- Never an **official College system**: no Pomona blue (#0057B8 family), no
  seal or wordmark, no "Student Portal" chrome. If a student could mistake it for
  the Registrar's audit, the design has failed.
- Never a **startup landing page**: no hero, no feature grid, no gradient,
  no marketing voice. The first thing on the page is the student's own record.
- Never **apologetically vague**: not "may contain errors" but the exact
  sentence in the masthead above, with a link.

## Typography

- **Display and catalog voice: Source Serif 4** (variable, optical sizes). Used
  for section headings, requirement labels, and every verbatim `sourceQuote`.
  A text serif marks "this is the College speaking, quoted" and gives the page
  its document register.
- **Interface text: IBM Plex Sans.** Controls, explanations in the tool's own
  voice, helper text.
- **Identifiers and numbers: IBM Plex Mono.** Course codes (`CSCI 051 PO`),
  credits (`0.25`), term labels (`SP 2027`), counts, grades. Codes align in
  columns; the eye can scan a list of twenty courses by department.

Why these, for this product: the page carries three voices, the College's
(verbatim rules), the student's (their record of codes and grades), and the
tool's (labels and controls). Three faces from two coherent families keep the
voices legible without decoration. Plex Sans and Plex Mono share metrics, so a
course code inside a sentence does not jump. Source Serif is a text face, not a
display face, so the quotes read as prose rather than as pull-quotes.

Self-host via `@fontsource/*` packages. No runtime font requests: the app makes
no network requests except to its own `/data/*.json`, and it should work
offline once loaded.

Fallbacks: `Georgia, serif` / `system-ui, sans-serif` / `ui-monospace, Menlo,
monospace`.

## Palette

**Light is the default** (v1). A viewer with no stored preference gets cream;
`System` and `Dark` remain in the toggle. `color-scheme` must follow
`data-theme` in both directions, or the browser paints native controls from the
OS scheme onto the wrong canvas (reviewer finding M-08).

Hue is reserved for meaning. The four verdicts and the two manual states are the
only strong colors on the page; everything else is ink on paper. Every status is
also carried by a glyph and a word, never by color alone.

| Role | Light | Dark | Why |
|---|---|---|---|
| canvas | `#F5F0E6` warm cream | `#1B1A17` warm near-black | Letter paper, not a white screen. The transcript reference. |
| rule / hairline | `#D9D0BE` | `#3A372F` | Ruled rows replace cards and shadows. |
| primary text (ink) | `#1E1C19` | `#EDE7DA` | Also the color of buttons and links. Actions are ink, not a brand hue. |
| secondary text | `#6B665C` | `#A39D90` | Metadata: terms, provenance, "data as of". |
| satisfied | `#2E6B3F` | `#6FBF85` | Deep green ink. Glyph `●`. |
| partial | `#B0731A` | `#E0A54A` | Ochre. Glyph `◐`. Always accompanied by "n of m". |
| unmet | `#A63D2F` | `#E0776A` | Brick. Glyph `○`. Always accompanied by a candidate count. |
| unverifiable | `#4F5D75` | `#9FB0CC` | Slate, with a **dashed** border on the row. Glyph `◌`. Always accompanied by the prompt that would resolve it. |
| override / attestation (manual) | `#6E4A7E` | `#C39BD3` | Plum. A manual result is never the same color as an automatic one; the row also carries the word "override" or "attested" and the approver or prompt. |
| focus ring | `#2F6FE4` | `#6FA0FF` | Accessibility only; 2px outline offset 2px. Never used decoratively. |

Selection, hover and pressed states are tonal shifts of the canvas (`#EDE6D8`
hover, `#E4DCCC` pressed in light), not new hues.

### Family hues (v1, map only)

Three quiet hues distinguish the three families. They are used **only** on the
family label (11px, letter-spaced small caps) and on the 1px bracket that
gathers its nodes. Never a fill, never a node, never a row background, because
**status owns fill**.

| Family | Light | Dark |
|---|---|---|
| Breadth | `#5B6E8C` dusty blue | `#93A7C4` |
| Overlays | `#3E6F76` deep teal | `#7FB0B8` |
| Foundations | `#7A5C46` warm brown | `#C2A088` |

These sit in a crowded space, and the measurement came back against them.
Measured on the cream canvas (frontend, 2026-09-11): family-overlay sits **10
degrees** from the unverifiable slate and family-foundation **9 degrees** from
the partial ochre, against five status hues already spread across 7, 36, 137,
218 and 282 degrees. There is no room for three more a student could tell apart
from state.

**Resolved: family hue never touches a node.** It is used on the family label
and its 1px bracket only, so hue on a node ring means exactly one thing — status
— and grouping is carried by position and label. This is the outcome this
section authorised, taken on a measurement rather than an impression.

## Information density

**Dense.** The competition is a spreadsheet.

The v0 build promised "the entire audit fits in one viewport" and shipped an
audit **1774px tall at 1440x900** with 57px rows. The v1 target is stated so it
can be measured and held:

| At 1440x900, with a 32-course plan loaded | Target |
|---|---|
| Masthead + collapsed record + the whole map | **fits above 900px**, no scrolling |
| A collapsed requirement row | **<= 40px** |
| The map itself | **<= 320px** tall |

The record collapsing to one line is what makes the map reachable without
scrolling. Detail rows below the map may run past the fold; that is correct,
because they are the evidence you go looking for, not the answer you arrive for.
Whitespace separates the four bands; it does not pad rows.

At 768px the sidenote column collapses beneath each row as a one-line quote
that expands on tap. At 390px the record becomes a single-column list with the
term and grade on a second line, the requirement rows keep glyph, label, status
and satisfying course on one line, and "What satisfies this?" candidates stack
with the term ribbon beneath each course. Mobile is designed for the
outside-the-advisor's-office moment: read-mostly, one thumb.

## Content hierarchy

1. **What is unmet or partial, and what would close it.** Unmet and partial
   rows sort to the top of their group, and their candidate counts are visible
   without expanding.
2. **What is satisfied, and by which course.** Never a bare checkmark.
3. **The evidence.** Verbatim sourceQuote in the margin; rule in plain English;
   `draft` / `unverified` encoding confidence shown on the row when it is not
   `verified`.
4. **Provenance and freshness.** Catalog year, "data as of", staleness banner
   when data is older than one catalog year. Persistent, quiet, in the masthead.
5. **The disclaimer and attribution.** Persistent in the masthead and footer,
   specific, linked.

## Signature element

v1 has two, and they are one idea at two scales: **the map answers, the margin
proves.**

**1. The requirement map.** Twelve rings in three families, each showing its
state and the course that satisfied it, all above the fold. A student opens the
page and knows where they stand before touching anything. No official tool on
this campus shows the whole shape of the requirement at once - and nothing in it
is a percentage.

**2. The margin of evidence.** Every requirement row is a two-column line: on the
left the verdict glyph, the requirement label, the status word and the course
that satisfied it, set in mono; on the right, in the margin, the catalog's
verbatim sentence in small serif, joined to its row by the same hairline rule.
**In v1 the quote lives in the expanded row rather than permanently in the
margin** - permanently visible, it was half the audit's height - but the rule is
unchanged: no verdict is ever shown without the College's own sentence one click
away, and the expanded row reserves its margin for it. When a row is
`unverifiable`, the margin holds the question the student must answer instead of
a quote. When a result is an override, the margin holds who approved it.

Secondary motif, required inside "What satisfies this?": **the term ribbon.**
Each candidate course carries a compact row of the last eight terms
(`FA SP FA SP FA SP FA SP`) with a filled mark for every term it actually ran,
from Hyperschedule's offering history. "Has this course run recently?" is a
glance, not a search. No official tool can draw this ribbon; it is the product's
most differentiated asset made visible.

## Interaction notes

- **Course entry is the highest-friction moment, and v1 removes most of it.**
  The only thing a student must supply is *which courses* they took. Term,
  grade and where-it-was-taken are optional: term and grade default to unknown
  (the engine handles that honestly, `docs/API.md` 2.7), and provenance is
  inferred from the campus code in `CSCI 051 PO`. The per-row Term, Grade and
  "Taken at" controls move behind a per-row `edit` disclosure; the default row
  is code, title and a remove control. A student who never opens that
  disclosure still gets a correct audit.
- Three ways in, one parser behind them: type-ahead (opens on the first
  keystroke, matches department, number and title, commits on Enter), **paste**
  (a whole blob copied out of the portal's academic history, not just tidy
  spreadsheet rows), and later a **transcript PDF** read in the browser. All
  three preview what was parsed, and what was not, before anything is added.
  Nothing is ever added silently.
- Rows expand in place with a short height transition (about 180ms, ease-out).
  No other motion is required. Nothing animates because it can.
- Overrides and attestations are entered inline in the expanded row and appear
  immediately in plum with their label.
- Export, import and share live in the footer strip. The share link puts the
  plan in the URL **fragment**; copying it shows a one-line note that the link
  contains the student's own record and should be shared deliberately.

## Justified exceptions

| Pattern | Why it belongs in this product |
|---|---|
| Monospace type for identifiers (`DESIGN_CONSTRAINTS` 17, "robotic fonts") | Not an identity choice; course codes, credits and terms are fixed-width data that must align in columns. The identity faces are a text serif and a humanist sans. |
| A shadow on the autocomplete popover and on any dialog | Elevation semantics: the popover floats above the record. Nowhere else. |
| Progress bars | Only for real counts ("4 of 6 breadth areas", "1 of 2 PE"). Never for GPA, credits toward 32, or an overall figure. |
| Cream canvas instead of pure white | Deliberate: the transcript reference. Dark mode uses a warm near-black for the same reason. |
