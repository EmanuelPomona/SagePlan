# Design Constraints

**This is the only copy of these constraints in the repository.** They are not
restated in `CLAUDE.md`, in `AGENT_PROTOCOL.md`, or in any agent definition. If
you find a second copy, it is stale — delete it.

Frontend reads this before design work. Reviewer reads it before visual review.

---

## 1. The primary test

Everything below is downstream of one question:

> **Could this exact visual system be pasted onto an unrelated AI startup with
> only the logo changed?**

If yes, the design has not done its job yet, regardless of how many rules on this
page it satisfies.

This test is the gate. The list in section 3 is a set of worked examples of
failing it — useful, but secondary, and it will age.

---

## 2. Positive direction comes first

A ban list constrains where the design cannot go. It does not aim it. Avoiding
the twenty tropes below and nothing else produces a predictable result: flat
bordered rectangles, neutral off-white canvas, a serif display face, wide
tracking, two restrained hues. That is better than what it replaced, and it is
also currently the most recognizable "tasteful AI output" signature in existence.

So the aim comes from `docs/DESIGN_BRIEF.md`, which must commit to concrete
choices before implementation begins:

- **Reference points** — two or three named products, publications, or physical
  objects. "Modern and clean" is not a reference point.
- **Type pairing** — specific faces, with a stated reason tied to the product.
- **Palette** — each color assigned a semantic role, not a decorative one.
- **Signature element** — one idea that could not appear in a different product.
- **Anti-character** — what this must never feel like.

**The reviewer checks the implementation against the brief, not against this
list.** A design that satisfies the brief and technically uses a gradient is
fine. A design that avoids every banned pattern and matches nothing in the brief
is not.

---

## 3. Anti-default patterns

These are forbidden **as defaults**, not absolutely. Using one requires a reason
recorded in `docs/DESIGN_BRIEF.md`.

1. Harsh gradients
2. Pure white backgrounds
3. Rainbow / multi-hue coloring
4. Drop shadows used for decoration
5. Three generic feature cards in one row
6. Emojis as interface icons
7. Liquid glass / glassmorphism
8. Em dashes in interface copy
9. Inter, Geist, or Space Grotesk as the default visual identity
10. Bento grids
11. Colored left-edge stripes as generic accent
12. Copy using the formula "It's not X, it's Y"
13. Radial gradient orbs
14. Dot-grid backgrounds
15. Sparkle icons
16. Neon colors
17. Robotic / sci-fi fonts without explicit product need
18. Strong futuristic visual language without explicit product need
19. Decorative grid backgrounds
20. Cards nested inside cards
21. Meaningless stat tiles and fake dashboard charts
22. Animation applied because animation is possible

### Three of these are narrower than they look

- **Drop shadows (4)** — banned as *decoration*. Elevation is a real semantic:
  menus, dialogs, popovers, and dragged objects should read as floating above the
  plane, and a shadow is the correct tool. Prefer borders, tonal contrast, and
  spacing for everything that is not literally elevated.
- **Pure white (2)** — banned as a *thoughtless* canvas. Editorial, print-like,
  and high-contrast-accessibility products may legitimately want white. Choose it,
  do not default into it.
- **Em dashes (8)** — a house copy rule, not a design rule. It applies to
  interface strings only, not to documentation, comments, or commit messages.

---

## 4. Preferred moves

- Warm/off-white, tinted, dark, or contextual canvas rather than default white
- Flat hierarchy built from borders, tonal contrast, spacing, and typography
- Restrained color systems where each hue carries meaning
- Product-specific layouts rather than automatic card or bento grids
- Typography chosen because it supports the product's identity
- One coherent icon system
- Backgrounds that communicate something or are absent
- Real content over placeholder content

---

## 5. Self-check

Before implementation, and again before handoff:

1. Does the implementation match the reference points named in the brief?
2. Is the signature element from the brief actually present and visible?
3. Did I use a gradient, shadow, or decorative background where a flat tone would
   be stronger?
4. Is the canvas pure white without a product-specific reason?
5. Did I create a generic three-card feature row or default to a bento grid?
6. Did I choose typography, or accept a default?
7. Does any interface copy use an em dash, or "It's not X, it's Y"?
8. Does the page feel robotic or synthetic without the product requiring it?
9. **The primary test in section 1.**

Run `scripts/slop-check.sh` for the mechanically detectable subset. It is advisory
— every hit needs either removal or a justification recorded in the brief. It does
not replace the questions above; roughly eight of the twenty-two patterns are
greppable and the rest need judgment.
