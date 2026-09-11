# Accepted, Unfixed Findings

Owned by the reviewer (`docs/AGENT_PROTOCOL.md` §3). A row lands here when a
finding is real, reported, and deliberately not blocking the gate — under §11
visual findings are advisory and never withhold approval on their own. Taste
disputes belong to the human, who owns them.

Nothing here is a defect the reviewer failed to find. Everything here was
measured, and the measurement is in the row.

---

## From Round 1 (2026-09-08) — advisory, attached to APPROVED tasks

| ID | Task | Kind | Finding | Measurement | Suggested fix |
|---|---|---|---|---|---|
| D-01 | TASK-021 | VISUAL | The brief states twice that "the entire audit … fits in one viewport at 1440px" with row height "about 32px". It does not. | At 1440×900 with the F-01 plan the audit block is **1774px** tall against an 823–900px viewport; sample row heights 57, 57, 32. Evidence: `docs/review/R-01-desktop-1440-full.png` | Tighten the requirement row to the brief's ~32px mono line, or amend `DESIGN_BRIEF.md` if 15 rows in one viewport is no longer the intent. |
| D-02 | TASK-022 | VISUAL | At 390px, opening "Add an exam" widens the whole page and zooms the document out. | True 390×844 mobile viewport: layout viewport goes **390 → 595px** on open (scrollWidth 595, visualViewport 390) because the exam `<select>` sizes to its longest option at **541px**. Evidence: `docs/review/R-07-mobile-390-exam-select-DEFECT.png` | `select { max-width: 100% }` (the field is already full-width at that breakpoint). One line. |
| D-03 | TASK-021 | VISUAL | Every checkbox renders as a 13×32px dark block rather than a checkbox. | `apps/web/src/styles/global.css:252` applies `min-height: 32px` + padding/border/background to `input, select, textarea, button` with no checkbox exemption anywhere; `global.css:9` sets a static `html { color-scheme: light dark }`, so native controls are painted in the dark scheme while `data-theme="light"` is active. 13 checkboxes affected. **WCAG 2.2 AA 2.5.8 still passes** — the wrapping `<label>` hit box measures 77×40. | `input[type=checkbox] { min-height: auto; width: auto; }` and make `color-scheme` follow `data-theme` in both directions. |

### Documentation drift, low cost, easy to lose track of

| ID | Task | Finding | Measurement | Suggested fix |
|---|---|---|---|---|
| D-04 | — | README's demo share link hard-codes port 3001. | `bootstrap.sh` assigns a port per worktree; this reviewer's was 3003, so the documented link 404s outside the frontend worktree. | Use `$FRONTEND_PORT`, or document the `#plan=…` fragment on its own. |
| D-05 | TASK-001 | `validate-artefacts.ts` under-reports its own coverage. | `checkQuote` pushes an outcome only on failure, so the summary prints "6 check(s), 0 failed" while **34** quote checks actually ran. ACCEPTANCE cites this artifact for AC-P02. | Count passing quote checks so the number means something. |
| D-06 | — | `scripts/slop-check.sh` defaults to a `frontend/` directory that does not exist in this layout. | `./scripts/slop-check.sh` → `no such directory: frontend`; the app is at `apps/web`. The reviewer's own mechanical check does not run out of the box. | Default the argument to `apps packages`. |
| D-07 | TASK-010 | Handoff figures drift from the shipped artefacts. | "2,087 Pomona courses" vs 2,005 PO / 2,067 Coursedog-sourced in `data/catalog.json`; sections 2,159 vs 2,160. | Regenerate the figures from the artefacts at handoff time. |
| D-08 | TASK-012 | `geCodes.ts:8-13` allowlists `1DDP` and `1P1…1P10` on a factually wrong comment ("these subdivide 1PE"). | 122 FA2026 sections carry a `1P*` code with no `1PE`. No GE attribute is lost — all 12 live Pomona codes map — but AC-B04's "or is reported" clause is unsatisfied and the reported "0 unrecognised Pomona code(s)" is an artefact of the allowlist. | Report unrecognised codes instead of allowlisting them silently, and fix the comment. |
| D-09 | TASK-020 | `docs/ACCEPTANCE.md:103` (F-12) conflicts with ADR-007 on waived rows. | ACCEPTANCE says "every requirement `unmet` or `unverifiable`"; two rows are `satisfied` with `waived: true`, which is what ADR-007 and API.md §2.4 require. The engine is right; the doc is stale. | Reconcile the ACCEPTANCE row to ADR-007. |
| D-10 | TASK-011 | `parseCsv.ts:62` coerces a garbled `Measure Values` to 0 ("overlay absent") with no count. | `Number((f[i.measureValue] ?? "0").trim()) || 0`. No live impact: only 0, 1 and 2 occur in the committed export. | Count and report unparseable measure values. |

---

## Not debt — routed as blocking findings in Round 1

For the avoidance of doubt, these were **not** accepted and are not in the table
above. See `docs/handoffs/agent-reviewer.md`: H-1 (unresolved contract change
request), H-2 (AC-B01), H-3 (282 unexplained GE divergences), H-4 (AC-B03's
exclusion report), H-5 (missing `sections-SP2027.json`), H-6 (`Measure Values = 2`
PE courses collapsed to a boolean — the one finding that changes an answer a
student would see), and M-1…M-5.

## From Round 2 (2026-09-11) — unverifiable, not failed

| ID | Task | Kind | Finding | Measurement | Suggested fix |
|---|---|---|---|---|---|
| D-11 | TASK-013 | UNVERIFIED | AC-B07 (the nightly workflow opens a PR) has never executed anywhere. | `git remote -v` is empty on 2026-09-11: the repository exists only on this machine. `actionlint` and `act` are absent, so only YAML validity and structure could be checked. | **Owner action:** create the GitHub remote and push. Until then the reviewer records BLOCKED on AC-B07 rather than APPROVED (ADR-020). |
| D-12 | TASK-011 | OPEN QUESTION | `Measure Values = 2` on nineteen Physical Education rows: verified to exist, meaning unknown. | A literal `=== "1"` pivot yields PE 222; the `>= 1` rule yields the expected 241. | Ask the Registrar what `2` means. If it means "counts as two PE courses", add the optional `attributeWeights` field backend proposed - additive, no `schemaVersion` bump (ADR-020). |

## From Round 2 (2026-09-11) — TASK-030 engine gate, advisory

| ID | Task | Kind | Finding | Measurement | Suggested fix |
|---|---|---|---|---|---|
| D-13 | TASK-030 | FUNCTIONAL | A one-site regression of ADR-013's minimize-sharing is invisible to the whole golden suite. | Minimize-sharing lives at two independent sites: `localBetter` (greedy, `assignment.ts:~211`) and `betterScore` (backtracking, `~172`). Inverting **either alone** leaves all 21 goldens green; only inverting **both** fails F-06. F-06 short-circuits in the greedy phase (`optimal()` requires `shared === 0`), so it never exercises `betterScore`. | Add a fixture where sharing is unavoidable so greedy is non-optimal and the backtracking path is forced, guarding each site independently. |
| D-14 | TASK-030 | DOC | A stale comment describes the superseded tie-break directly above the code that replaced it. | `packages/engine/src/assignment.ts:57-60` (Phase 1 header): "add the fewest NEW courses, so a course that already counts elsewhere is reused before a fresh one is spent (docs/API.md 2.3 step 4)" — the superseded rule, citing the API.md section ADR-013 rewrote. The `localBetter` comment 145 lines later is correct and contrasts the old rule explicitly. | Rewrite the Phase 1 comment to ADR-013's rule and drop the stale 2.3-step-4 citation. |

