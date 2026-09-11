# STATUS: main
Task: v1 re-scope (Mode A) complete; TASK-030..033 READY for frontend
Round: 0
Last updated: 2026-09-11T16:10:00Z

## Skills invoked so far
- (2026-09-08 planning) brainstorming, ecc:product-lens, ecc:contract-first, superpowers:writing-plans, ecc:architecture-decision-records, superpowers:verification-before-completion
- ecc:architecture-decision-records @ recording the five v1 decisions -> ADR-011..015
- superpowers:verification-before-completion @ before handoff 2 and the commit -> re-ran the five gates with explicit exit codes; caught the gitignore negation bug

## Done
- [x] Read reviewer round-1 verdict (CHANGES_REQUIRED), DEBT D-01..D-10, and the app screenshots
- [x] Owner answered 4 v1 questions: paste-first transcript, one map not three overlays, light default + quiet family hues, quotes on expand
- [x] Resolved the open gpa CONTRACT CHANGE REQUEST (ADR-014) and my own assignment tie-break spec bug (ADR-013)
- [x] packages/shared: term/grade/gradeMode/matriculationTerm nullable; openapi regenerated; 13 tests pass
- [x] GE program: gpa moved to advisories (17 requirements, 8 advisories); validate-artefacts 0 failed
- [x] API.md 2.2/2.3/2.7, DESIGN_BRIEF v1 revision, ACCEPTANCE AC-V01..V11 + fixture corrections, PRODUCT v1 table, ADR-011..015
- [x] TASK-030..033 written READY; INDEX regenerated (17 tasks)
- [x] Owner reference image committed at docs/design-refs/v1-requirement-map-reference.png

## In progress
- [ ] Dispatch to the three worker sessions (owner granted explicit permission 2026-09-11)

## Verified
- typecheck 0, lint 0, shared tests 13/13, openapi --check current, validate-artefacts 0 failed (rc 2 = generated artefacts absent, by design)
- INDEX.md regenerates identically; design constraints in one file; no secrets; samples PDF ignored, its README tracked

## Blocked on
- nothing for planning. Owner follow-ups: (1) drop a real transcript at data/sources/samples/ to unblock the PDF tier of ADR-012; (2) still name a successor in README before any public launch; (3) three GE requirements remain confidence: draft pending the Registrar.

## Owed, not done
- main has neither worker merged. Integration must happen in a FRESH session (protocol Mode B).
