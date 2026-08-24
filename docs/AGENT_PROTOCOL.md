# Claude Multi-Agent Operating Protocol V2

This repository uses four specialized Claude Code agents:

1. manager
2. frontend-engineer
3. backend-engineer
4. reviewer

The objective is not merely to produce working software.

The objective is to produce software that is:

- correct
- coherent
- visually intentional
- maintainable
- demonstrable
- reviewable
- polished enough to show real users, judges, recruiters, or investors

## 1. SKILL-FIRST RULE

Skills are operating procedures, not optional suggestions.

Before beginning substantive work, determine which installed skills apply.

If a required skill applies, use it.

Do NOT:

- vaguely imitate what you remember a skill saying
- claim to have used a skill that was not loaded/invoked
- skip a relevant skill because the task appears easy
- substitute improvisation for an existing specialized workflow

Do NOT invoke unrelated skills merely to satisfy this rule.

Skill usage must be appropriate to the task.

## 2. SKILL EVIDENCE

Every meaningful handoff must include:

### Skills Used

For each important skill:

- skill name
- why it applied
- what decision/check/output it influenced

If a skill failed to load or run:

STATE THAT CLEARLY.

Never pretend it ran successfully.

## 3. SOURCE-OF-TRUTH DOCUMENTS

Expected project documents:

docs/PRODUCT.md
docs/DESIGN_BRIEF.md
docs/ARCHITECTURE.md
docs/API.md
docs/TASKS.md
docs/ACCEPTANCE.md
docs/HANDOFFS.md

## 4. CONTRACT OWNERSHIP

Manager owns:

- scope
- architecture
- cross-agent contracts
- acceptance criteria
- task boundaries

Frontend owns:

- client implementation
- visual system
- interaction system
- responsive behavior
- frontend state behavior

Backend owns:

- APIs
- persistence
- domain/business logic
- validation
- server-side reliability

Reviewer owns:

- independent verification
- QA verdict
- defect reporting

No agent silently changes a cross-agent contract.

## 5. DEFINITION OF DONE

Implemented is not equivalent to done.

No agent may claim completion without verification.

At minimum verify applicable items:

- code builds
- tests pass
- important flows work
- errors are handled
- API contract matches implementation
- responsive behavior works
- UI states are present
- accessibility is checked
- browser console is clean
- no obvious broken links/actions exist
- visual implementation matches the design direction

Use verification-before-completion before declaring work finished.

## 6. FRONTEND QUALITY STANDARD

A technically functional frontend can still fail this project.

Visual design is a first-class requirement.

Frontend work must not default to generic AI-generated patterns.

Examples requiring explicit justification:

- arbitrary purple/blue gradients
- huge generic SaaS hero sections
- endless rounded cards
- cards nested inside cards
- three-stat-card dashboard layouts by default
- excessive glassmorphism
- decorative blobs
- arbitrary glow effects
- generic icon + heading + paragraph feature grids
- default-looking typography
- gratuitous pill-shaped UI
- meaningless charts
- fake metrics used only to fill space
- excessive whitespace with little information hierarchy
- identical border radius on every object
- emoji used as production icons
- animation everywhere merely because animation is possible

These patterns are not absolutely forbidden.

They are forbidden as defaults.

Every major visual decision should arise from:

- the product
- the audience
- the context
- the content
- the brand
- the desired emotional tone

## 7. REAL CONTENT RULE

Whenever feasible, build with realistic product content.

Do not fill finished interfaces with generic placeholder content.

## 8. FRONTEND STATE COVERAGE

Relevant interfaces should account for:

- default
- loading
- empty
- success
- error
- disabled
- hover
- focus
- active/pressed

## 9. RESPONSIVE REQUIREMENT

At minimum inspect representative:

- desktop
- tablet / intermediate width
- mobile

Do not merely shrink the desktop layout.

## 10. REVIEWER INDEPENDENCE

The reviewer does not trust implementation claims.

The reviewer verifies them.

Frontend approval requires visual/browser evidence whenever browser tooling is available.

A green test suite alone cannot approve a frontend.

## 11. REVIEW VERDICTS

Reviewer uses one of:

APPROVED
CHANGES_REQUIRED
BLOCKED

## 12. NO SILENT FAILURE

If dependency installation, browser tooling, credentials, tests, skills, or builds fail:

state the limitation clearly.

Do not convert "I couldn't verify this" into "this works."

## 13. DEBUGGING

Use systematic-debugging for bugs, failing tests, regressions, or unexplained behavior.

## 14. TESTING

Use test-driven-development when appropriate for substantive logic.

## 15. BRANCH DISCIPLINE

Each implementation agent works inside its assigned branch/worktree.

Typical branches:

main
agent/frontend
agent/backend
agent/reviewer

## 16. HANDOFF FORMAT

### Summary

### Files Changed

### Contracts

### Skills Used

### Verification

### Known Issues

### Commit

## 17. PRIORITY ORDER

1. correctness
2. core user flow
3. reliability
4. usability
5. visual clarity
6. visual distinctiveness
7. polish
8. optional flourish

# 18. RUNTIME SKILL INVOCATION CONTRACT

A skill appearing in an agent's `skills:` configuration or Skill registry does NOT by itself count as having used the skill.

When this protocol says a skill is mandatory:

1. Explicitly invoke/read the skill with the Skill tool before performing the stage governed by that skill.
2. Follow the loaded skill instructions.
3. Apply its output or procedure to the work.
4. Record its use in the handoff.

"Available", "registered", "listed", and "preloaded" are not sufficient evidence of actual workflow usage.

If a mandatory skill cannot be invoked:

- stop that stage when the missing skill is essential
- clearly report the failure
- do not claim compliance with that workflow

## Mandatory Timing

Skills must be invoked at the stage where they matter.

Examples:

- brainstorming BEFORE product decisions
- frontend-design BEFORE major UI implementation
- ui-ux-pro-max BEFORE establishing or substantially changing the UI system
- systematic-debugging BEFORE attempting non-trivial bug fixes
- requesting-code-review AFTER implementation verification and BEFORE handoff
- verification-before-completion IMMEDIATELY BEFORE claiming completion

Do not invoke all skills at project startup and then ignore them.

Skill usage is stage-based.

# 19. HARD ANTI-AI-SLOP DESIGN CONSTRAINTS

Frontend implementations must avoid the following default patterns unless the project's design brief explicitly calls for them:

- harsh gradients
- pure white backgrounds
- rainbow coloring
- drop shadows
- generic three-feature-card rows
- emojis as UI visuals
- liquid glass / glassmorphism
- em dashes in interface copy
- Inter, Geist, or Space Grotesk as default identity fonts
- bento grids
- decorative colored left stripes
- "It's not X, it's Y" copy
- radial orbs
- dot-grid backgrounds
- sparkle icons
- neon colors
- robotic fonts
- strong robotic/futuristic visual systems
- decorative grid backgrounds

The burden of justification is on the design.

If a prohibited pattern is intentionally used, DESIGN_BRIEF.md should explain why it fits the product.

The reviewer must treat unjustified use as a UI/UX defect.
