# Acceptance Criteria

What "done" means for this project. The reviewer gates against this file and
against the per-task criteria in `docs/tasks/`.

Every criterion must be checkable by someone who did not build the thing. If you
cannot describe how to check it, it is not a criterion.

Bad:  "The UI is polished."
Good: "At 390px the report sheet does not overlap the bottom navigation, and the
       submit button remains reachable without scrolling."

---

## Product

- [ ] The primary demo flow in `docs/PRODUCT.md` completes end to end.
- [ ]

## Frontend functionality

- [ ] Every interface state in protocol section 8 is present where relevant.
- [ ]

## UI/UX

- [ ] The signature element from `docs/DESIGN_BRIEF.md` is present and visible.
- [ ] The implementation is recognizable as its named reference points.
- [ ] No unjustified pattern from `docs/DESIGN_CONSTRAINTS.md`.
- [ ]

## Backend

- [ ] Implementation matches `docs/openapi.yaml` (`scripts/contract-test.sh` passes).
- [ ] Invalid input is rejected with a documented error shape.
- [ ]

## Integration

- [ ] Frontend reaches backend at the configured port with no CORS errors.
- [ ] Browser console is clean of errors during the primary flow.
- [ ]

## Demo

- [ ] Runs from a clean clone via `scripts/bootstrap.sh` with no manual steps.
- [ ] Demo data exists (`npm run seed`) so the app is not empty on first load.
- [ ] A recorded fallback of the working demo exists.
