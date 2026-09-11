---
id: TASK-031
title: Light default, v1 palette, family hues, and the four visual defects from round 1
status: REVIEW
owner: frontend
branch: agent/frontend
priority: HIGH
round: 0
depends_on: []
blocked_on: ""
---

# TASK-031 — Theme v1 and the round-1 visual defects

## Objective

Do this **before** TASK-032 and TASK-033 so their screenshots are taken against
the final palette and never need re-shooting.

1. **Light is the default canvas.** No stored preference resolves to cream, not
   to the OS scheme. `System` and `Dark` stay in the toggle.
2. **`color-scheme` follows `data-theme` in both directions** (reviewer M-08,
   D-03). Today `global.css:9` pins `html { color-scheme: light dark }`, so with
   an OS in dark mode and the Light theme selected the browser paints native
   controls from the dark scheme onto cream.
3. **Checkboxes render as checkboxes** (M-08). `global.css:252` applies
   `min-height: 32px` plus padding, border and background to
   `input, select, textarea, button` with no checkbox exemption; all 13 render
   as 13x32px blocks.
4. **`select` cannot widen the layout viewport** (M-07, D-02). At a true 390x844
   viewport, opening "Add an exam" takes the layout viewport from 390 to 595px
   because the exam `<select>` sizes to its longest option (541px).
5. **Family hues** for the map, defined in `docs/DESIGN_BRIEF.md` -> Palette ->
   Family hues, as tokens ready for TASK-033.

## Scope

```
apps/web/src/styles/tokens.css     light-first token set; add --family-breadth / --family-overlay / --family-foundation for both themes
apps/web/src/styles/global.css     color-scheme bound to data-theme; checkbox exemption; select max-width: 100%
apps/web/src/theme/useTheme.ts     default "light" when nothing is stored (not "system")
apps/web/src/test/useTheme.test.ts update for the new default
```

Do not restructure any component in this task. It is tokens, global CSS and one
default.

## Tests to write first

1. `useTheme.test.ts` — empty `localStorage` resolves to `light`; an explicit `system` still follows the media query; `dark` still wins.

## Acceptance Criteria

- [ ] AC-V08 in `docs/ACCEPTANCE.md`, in full, with its measurements pasted: the 390px layout-viewport width **before and after** opening "Add an exam" (must both read 390), and screenshots of a checkbox in light and dark.
- [ ] A fresh profile with no `localStorage` loads cream. Evidence: screenshot from a clean context.
- [ ] With the OS in dark mode and `Light` selected, native controls are painted light. Evidence: screenshot.
- [ ] Contrast re-measured for every status token on the **light** canvas (the round-1 numbers were taken on dark): satisfied, partial, unmet, unverifiable, manual, and the three family hues against the cream canvas. Paste the ratios. Anything under 4.5:1 for text is a defect to fix, not to report.
- [ ] `npm run typecheck`, `lint`, `test`, `build` pass; console clean.

## Notes

- Skills: `ecc:frontend-a11y` for the contrast and `color-scheme` work, `ecc:make-interfaces-feel-better` for the token pass, `ecc:browser-qa` before handoff, then `superpowers:requesting-code-review` and `superpowers:verification-before-completion`.
- Measure the 390px viewport with CDP emulation, not a resized macOS window: the reviewer noted a macOS window floors at about 500px and would fake this measurement.
- The family hues sit near the status hues on purpose-limited surfaces. Read the warning in the brief; if they read as status, the brief authorises you to drop them and group by position and label alone. Say so in the handoff.

## Review History

| Round | Verdict | Summary |
|---|---|---|
