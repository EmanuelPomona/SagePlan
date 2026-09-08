# Design Brief — Pomona GradGuide

Written by the manager before frontend work begins. This is a product-specific
design problem, not a style instruction. Frontend reads this together with
`docs/DESIGN_CONSTRAINTS.md` (the only copy of the visual constraints) and
`docs/PRODUCT.md`.

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

## Structural rule (owner decision, 2026-09-08)

**One page.** No tabs, no routes, no landing page, no navigation to other views.
The five "screens" in the product brief are sections and inline disclosures on a
single scrolling document:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ MASTHEAD  Pomona GradGuide · unofficial · Catalog 2026–27 · data as of 8 Sep  │
│           "The Registrar's official audit is the source of truth. Confirm     │
│            with your advisor before registering."  → portal link              │
├──────────────────────────────────────────────────────────────────────────────┤
│ YOUR RECORD                                                                   │
│   matriculated FA 2025 · first-year        [ type a course… CSCI 5|        ] │
│   CSCI 051 PO  Intro to CS          FA25  A-   PO                             │
│   ID   001 PO  Critical Inquiry     FA25  CR   PO                             │
│   …                                                                            │
│   AP Spanish Language · 5 · qualifies · grants Language                        │
│   [ paste from spreadsheet ]                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ YOUR REQUIREMENTS                         4 of 6 breadth · 3 overlays owed    │
│ ● Area 1  satisfied   ENGL 067 PO         │ "Criticism, analysis and         │
│                                           │  contextual study of works of    │
│ ○ Area 3  unmet       what satisfies this?│  the human imagination."         │
│   ▼ open in place ─────────────────────────────────────────────────────────── │
│     offered SP 2027                       ribbon  FA SP FA SP FA SP FA SP     │
│     HIST 101 PO  Modern Europe           ▮▯▮▯▮▮▯▮   also closes: Analyzing… │
│     PHIL 032 PO  Ethics                  ▮▮▮▮▮▮▮▮                            │
│ ◐ PE      partial  1 of 2   PE 001 PO     │ …                                 │
│ ◌ Language unverifiable → confirm         │ …                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ EXPORT · IMPORT · SHARE LINK      Data: Hyperschedule (BSD), Coursedog · About │
└──────────────────────────────────────────────────────────────────────────────┘
```

A requirement row expands in place to reveal its detail (full verbatim quote,
plain-English rule, override and attestation controls) and its candidates. Only
one row needs to be open at a time, but nothing forbids several. Nothing ever
replaces the page.

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
   students who use it. GradGuide should feel like Hyperschedule's sibling, not
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

Hue is reserved for meaning. The four verdicts and the two manual states are the
only colors on the page; everything else is ink on paper. Every status is also
carried by a glyph and a word, never by color alone.

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

## Information density

**Dense.** The competition is a spreadsheet. At 1440px the entire audit (15
requirement rows with their satisfying courses and sidenotes) fits in one
viewport under the record section. Row height is set by the mono line, about
32px. Sidenotes are set at 13px serif. Whitespace separates the three page
sections; it does not pad rows.

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

**The margin of evidence.** Every requirement row is a two-column line: on the
left the verdict glyph, the requirement label, the status word and the course
that satisfied it, set in mono; on the right, in the margin, the catalog's
verbatim sentence in small serif, joined to its row by the same hairline rule.
The layout reserves space for the College's words on every line, so the page
cannot physically show a checkmark without its reason. When a row is
`unverifiable`, the margin holds the question the student must answer instead of
a quote. When a result is an override, the margin holds who approved it.

Secondary motif, required inside "What satisfies this?": **the term ribbon.**
Each candidate course carries a compact row of the last eight terms
(`FA SP FA SP FA SP FA SP`) with a filled mark for every term it actually ran,
from Hyperschedule's offering history. "Has this course run recently?" is a
glance, not a search. No official tool can draw this ribbon; it is the product's
most differentiated asset made visible.

## Interaction notes

- Course entry is the highest-friction moment. The autocomplete opens on the
  first keystroke, matches on department, number and title, shows the course's
  GE attributes inline in the results, and commits on Enter. Paste accepts
  tab- or comma-separated rows in any of the common spreadsheet shapes (code
  only; code + term; code + term + grade) and previews what it parsed before
  adding.
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
