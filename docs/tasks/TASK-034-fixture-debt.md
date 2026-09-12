---
id: TASK-034
title: Fixture debt — F-03c, a guard for the second minimize-sharing site, and one rotten comment
status: READY
owner: frontend
branch: agent/frontend
priority: MEDIUM
round: 0
depends_on: [TASK-030]
blocked_on: ""
---

# TASK-034 — Fixture debt from the round-2 engine gate

TASK-030 was **APPROVED** at round 2. These are the three items the reviewer
filed alongside it. None is an engine defect; all three are places where a
correct implementation is guarded by a test that cannot fail. Small and
independent — do them whenever TASK-033 gives you a gap.

## 1. F-03c — the fixture that was agreed and then missed (reviewer R2-M1)

Specified in `docs/ACCEPTANCE.md`'s fixture table and in TASK-030's Notes, but
not in TASK-030's Acceptance Criteria checklist, which is very likely why it
slipped. The template now says Notes are non-normative for exactly this reason.

Add `F-03c`: a plan in which the **IB Language A SL 6-7 exam is the only thing
that could satisfy Language** — no other LANGUAGE-granting exam, no
LANGUAGE-tagged coursework. Neutralising `ib-language-a-requirement` must flip
`language` from `satisfied` to `unmet`. F-03b carries five LANGUAGE granters and
the IB one has `credits: 0`, so its golden is byte-identical with the clause
removed and cannot evidence AC-P16.

Leave F-03b alone; its other threshold assertions each test their own rule.

## 2. F-15 — guard the second minimize-sharing site (reviewer D-13)

ADR-013's minimize-sharing lives at **two independent sites** and is guarded at
one. Measured by the reviewer:

```
betterScore inverted only (backtracking)    21/21 PASS
localBetter inverted only (greedy)          21/21 PASS
BOTH inverted (the actual superseded rule)  F-06 FAILS
```

F-06 short-circuits in the greedy phase — `optimal(greedyScore)` requires
`shared === 0` — so `betterScore` never runs for it. A revert of either site
alone would silently restore the M-2 attribution defect with every golden green.

Add **F-15**, a fixture in which **sharing is unavoidable**, so the greedy result
is provably non-optimal, backtracking runs, and `betterScore` is the deciding
comparison. The shape: a plan whose only Analyzing Difference course is also its
only Area 3 course (so `shared >= 1` in every valid assignment), plus enough
competing requirements that the order in which the shared course is credited
changes `satisfiedBy`. Then assert the exact attribution, and assert it fails
under an inverted `betterScore` alone — the same mutation discipline as F-06.

## 3. D-14 — comment rot on the line ADR-013 changed

`packages/engine/src/assignment.ts:57-60`'s Phase 1 comment still describes the
superseded rule — *"a course that already counts elsewhere is reused before a
fresh one is spent (docs/API.md 2.3 step 4)"* — directly above code doing the
opposite, and cites the section ADR-013 rewrote. The `localBetter` comment 145
lines later is correct. Fix the comment and the citation.

## 4. D-17 — the desktop map wraps badly (visual, advisory)

At 1440 the three family panels are sized by their content, so Breadth takes
five nodes on one row and wraps Area 6 alone onto a second, leaving a wide empty
band; Overlays wraps 2+1 and Foundations 2+1, breaking "Physical Education"
across two lines. The same map at 390 is a clean three-column grid per family
and reads better than the desktop derived from it.

No criterion is breached — the map measures 274px against a 320px bar — so this
is advisory under protocol section 11 and did not block TASK-033's approval.
But the brief asks the desktop to read crisply, and a three-column grid for
Breadth (3x2) with panels of comparable width would fix the empty band and the
broken label together. Take it if TASK-033's approval leaves you the room.

## Acceptance Criteria

- [ ] **F-03c exists**, is listed in `docs/ACCEPTANCE.md`'s fixture table, and its golden changes when `ib-language-a-requirement` is neutralised. Paste the mutation result.
- [ ] `docs/ACCEPTANCE.md` AC-P16 cites F-03c rather than the unit test once it lands (the manager will make that edit on your say-so, or do it yourself in the same commit).
- [ ] **F-15 exists** and fails under `betterScore` inverted alone. Paste both mutation results: inverted-alone must fail, restored must pass.
- [ ] `assignment.ts` Phase 1 comment describes the rule the code implements and cites the current `docs/API.md` 2.3.
- [ ] `npm run typecheck`, `lint`, `test` pass at root; `packages/engine/src` still pure by grep; both determinism tests still pass.
- [ ] **D-17 (advisory, take it or decline it in writing):** either the desktop map no longer wraps a family onto a near-empty second row and no node label breaks across two lines, or the handoff says why the current wrap is right. Evidence: a 1440x800 screenshot either way.

## Notes

- Skills: `superpowers:test-driven-development` for the two fixtures, `superpowers:verification-before-completion` before handoff.
- The reviewer verified F-13c discriminates by mutating `canPredateMatriculation` in both directions, and found that over-suppression (returning "agree" for everything) fails **F-13c alone** — F-13 and F-13b both pass it. That is the standard these two fixtures are held to: neutralise the thing, watch the golden move.
- Do not reopen TASK-030. Its own checklist is met and it is APPROVED at round 2; reopening it would corrupt the round ledger for no gain.

## Review History

| Round | Verdict | Summary |
|---|---|---|
