# STATUS: agent/reviewer
Task: review of TASK-010..013 + TASK-020..025 (10 tasks in REVIEW); TASK-090 partly executed
Round: 1
Last updated: 2026-09-08T21:05:00Z

## CORRECTION that shaped this round
My branch's docs/tasks/INDEX.md was STALE. Both workers finished on their own
branches and `scripts/integrate.sh` was never run, so from agent/reviewer every
task looked READY. Ground truth via `git show <branch>:docs/tasks/...`:
- agent/frontend @1b5cdf8 — TASK-020..025 all REVIEW (10 commits, 154 files)
- agent/backend  @cc7fe2c — TASK-010..013 all REVIEW (10 commits,  86 files)
- main @5c3d4e8 had neither merged.
I merged backend then frontend into agent/reviewer (integrate.sh order) and
reviewed the integrated result. Only conflict was package-lock.json, regenerated
per integrate.sh rather than hand-merged. Merge commit 63a19ee.

## Skills invoked so far
- ecc:contract-first @ before contract review -> gave me the "duplicate sources of
  truth" test; drove the zod/openapi/API.md drift check (46 == 46, no drift)
- ecc:security-review @ before the privacy/secrets stage -> scoped the audit to
  secrets + sensitive-data-exposure (no server/DB/auth here); drove the registrar
  CSV PII check and the AC-P07 network audit
- ecc:browser-qa @ before runtime QA -> phase structure (smoke/interaction/visual/
  a11y) and its "no baseline => INCONCLUSIVE, never a silent PASS" rule
- frontend-design:frontend-design @ before visual review -> its AI-slop cluster
  (cream + serif + hairlines + mono labels) is exactly this design's surface, so it
  forced me to test each against DESIGN_BRIEF rather than flag on sight
- ui-ux-pro-max:ui-ux-pro-max @ before a11y/interaction review -> WCAG 2.2 AA
  2.5.8 target-size rule (24 CSS px, web) which correctly downgraded my checkbox
  finding from a11y to visual-only
- ecc:make-interfaces-feel-better @ before the polish pass -> checklist that found
  the app already does reduced-motion, tabular-nums, no transition:all,
  focus-visible, font smoothing, text-wrap balance/pretty
- superpowers:verification-before-completion @ immediately before the verdict

## Verified (evidence, not adjectives)
- Every command claimed in docs/handoffs/main.md re-run independently; all 7 exit
  codes match exactly. scratchpad/verify.txt
- Integrated tree: typecheck rc=0, lint rc=0, `npm test` rc=0 with 572 tests
  (engine 149, pipeline 289, shared 13, web 121), `npm run build` rc=0.
- scripts/contract-test.sh -> exit 0 "6 check(s), 0 failed", CONTRACT OK.
- All 34 sourceQuotes are BYTE-EXACT substrings of their snapshots (my own checker,
  not validate-artefacts): 18 req + 1 constraint + 7 advisories + 8 external rules.
- TASK-002 ACs: 18 requirements, 7 advisories, 1 distinctDepartments constraint,
  draft on exactly area-6 / post-matriculation-credits-transfer /
  pomona-residency-credits. All confirmed.
- TASK-001 ACs: 46 registry schemas == 46 openapi schemas, identical names.
  API.md 1-2 defers field detail to the zod source (correct per contract-first).
- Registrar export independently re-measured: 28,845 data rows, 5,768 distinct
  courses, 1,785 PO, 13 campus codes, exactly one two-Area course (THEA085  PO),
  Measure Values distribution {0:27857, 1:969, 2:19}.
- AC-P07 performed BY ME from the browser network log: 96 HTTP requests, one host
  (own origin), all GET/200, only `?v=` query params, 0 query strings with plan
  data, CSP connect-src 'self' + form-action 'none'. docs/review/R-network.txt
- Console clean: 0 app errors/warnings/exceptions. docs/review/R-console.txt
- Skill audit on all three worktrees: 27 invocations, every handoff claim
  corroborated, ZERO ghosts.
- Keyboard focus ring after 3 real Tab presses: solid 2px rgb(111,160,255) offset
  2px == the brief's dark-mode focus token. :focus-visible matches.
- Contrast on the dark canvas: satisfied 7.85:1, partial 8.0:1, unmet 5.81:1,
  secondary 6.45:1 — all above WCAG AA 4.5:1.
- Error state, loading state, empty state all render real, helpful copy.
- Evidence captured at TRUE viewports via CDP Emulation (window resize floors at
  ~500px on macOS and would have faked the mobile shot).

## Checked and deliberately NOT filed (verification killed the hypothesis)
- REGISTRAR_GE_LABELS missing COMMUNITY_PARTNERSHIP -> correct; the registrar
  export has no such label. All 11 map keys occur in the file.
- Senior-exercise counts 314/3 not reproducible -> the brief measures the 2,811
  Coursedog catalog, a different population from the export; divergence there is
  what AC-P09's validator exists to find.
- 12 attribute checkboxes reporting accessible name "on" -> each is wrapped in a
  <label> with its text; implicit labelling is spec-valid. Tool artifact.
- Status glyphs absent from innerText -> they are <svg aria-hidden="true"> beside a
  real text word. "Never by colour alone" holds.
- Focus ring missing -> programmatic .focus() was the wrong instrument; real Tab
  gives the correct ring.
- slop-check hit (box-shadow) -> the brief's "Justified exceptions" names exactly
  that popover shadow.
- Share link "didn't import" -> a hash-only navigation does not remount; a real
  load shows a proper preview-and-confirm offer.

## Blocked on
- nothing. TASK-090 proper stays BACKLOG: it depends on TASK-013 + TASK-025, which
  are in REVIEW, not DONE. I executed its privacy audit, engine-golden review and
  skill audit early because the material existed.

---

# ROUND 2 — PREPARATION (holding; no worker gate performed yet)
Last updated: 2026-09-11

## Posture
HOLDING. Not a partial round 2. `agent/frontend` has TASK-020..025 + TASK-030 at
REVIEW but TASK-031/032/033 still READY, so the v1 interface (map, theme,
transcript record) does not exist and AC-V01..V11 are not measurable.
`agent/backend` has one round-2 commit (d61829a) with TASK-010..013 at REVIEW.
Offered the manager a TASK-030-only gate; awaiting their dispatch call.

## My branch is BEHIND main — re-run scripts/sync.sh before gating
`main` is at 32b9863; my HEAD is behind. This already caused one bad read: I
grepped my own working copy to confirm a manager amendment and got a stale
answer. **Verify doc claims with `git show main:<path>`, not the working tree,
until sync lands.**

## What my round-1 findings became (verified against main, not taken on trust)
- H-1 (unrouted CCRs) -> ADR-014 + ADR-016; ADR-016 adds a standing integration
  rule: check every handoff for an open CCR first.
- H-2 (AC-B01 2,700) -> SUPERSEDED. Now `id.affiliation === "PO"` counted after
  exclusions, floor **1,900**; new **AC-B01b** caps AC-B00 exclusions at 25.
- H-3 (AC-P09) -> SUPERSEDED. Now "zero **uncategorised**"; the 210-row
  "attribute sets differ" bucket must be subdivided by SHAPE, with an explicit
  `unclassified` bucket that must be zero. ~260 raw is the accepted steady state.
- M-2 (F-06 / API.md 2.3 step 4) -> ADR-013 replaces prefer-most-unassigned with
  minimize-sharing. F-06 must now assert exact attribution AND fail under the old
  rule (mutation test).
- M-3 -> ADR-014; fake-major moves to `scope:"overall"`; new F-14 covers deferred.
- M-1 -> accepted; F-05's plan must total exactly 31.0 credits.
- M-5 -> AC-B00 + AC-B01b + an exact-courseKey denylist
  (`data/catalog-denylist.json`, **does not exist yet — backend's to create, do
  NOT file its absence as a finding this round**).
- M-6/M-7/M-8 + D-02/D-03 -> promoted from advisory debt to BLOCKING criteria
  AC-V03 / AC-V08, because the owner complained independently.
- D-09 -> ACCEPTANCE F-12 reconciled to ADR-007.
- L-9 (F-03b asserts nothing) -> now an explicit TASK-030 deliverable.

## The agreed instrument (part of the criterion — do not substitute)
AC-V02/AC-V03 are measured in a **1440x800 viewport** via CDP
`Emulation.setDeviceMetricsOverride`, with `innerWidth`/`innerHeight` **read back
from the page** as evidence. Rationale: a macOS window resize floors near 500px
wide and a 1440x900 window yields ~823px of viewport, so window resizing fakes
both axes. Targets: collapsed row **<= 40px**, map **<= 320px**, map bottom edge
above the fold. My v0 baseline was 57px rows / 1774px audit.

## Open at the time of writing (raised to the manager, unresolved)
1. **OPEN CCR** `agent/frontend` b1d4d62 — API.md 2.7's two sentences disagree.
   Verified: `post-matriculation-credits` is
   `{credits, n:30, sinceMatriculation, includeExternal:false}`, and
   `agent/frontend:packages/engine/test/golden/F-13.json` has exactly one
   `unverifiable` row — that requirement. **Collides with AC-V06** ("only course
   codes produces a correct audit"). One of AC-V06, 2.7's second sentence, or
   TASK-030's bounded test must give. Because `includeExternal:false`, exam
   credit cannot be the distinguishing factor, so the task's "student with AP
   credit and every term null" test is unsatisfiable alongside the refinement.
2. **STRUCTURAL — the round counter cannot survive.** Measured: TASK-010 is
   round=1 on agent/reviewer but round=**0** on main, agent/backend and
   agent/frontend. A reviewer branch is never integrated, so protocol 21's
   round-3 ESCALATE safeguard can never fire and the fix loop has no terminator.
   Proposed moving the counter to a reviewer-owned `docs/review/rounds.md`.

## Round-2 verification plan (what to do when the gate opens)
- Re-run sync, then re-measure AC-V02/V03 under the instrument above.
- AC-B01: count `id.affiliation === "PO"` in the finished catalog (>= 1,900);
  AC-B01b: exclusions <= 25; AC-B00: assert `ENGL 170R PO` still carries BOTH
  `AREA_1` and `WRITING_INTENSIVE` (not merely that it exists), and that the six
  substring casualties survive.
- AC-P09: check the `unclassified` bucket is zero AND that the shape
  subdivisions are real, not one relabelled bucket.
- F-13 bounded evaluation: **neutralise the pessimistic pass inside the test and
  confirm the golden changes.** A golden recording only agreed cases is
  unfalsifiable — this is how L-9 was found.
- Transcript parser: confirm nothing is ever added without the preview step.
- AC-V05: the 2.00 GPA sentence must still be on the page (collapsed "Other
  degree rules"); the honesty rule is that we never hide a rule we do not check.
- Evidence bar unchanged: no runtime evidence -> BLOCKED, never APPROVED.

## Update 2026-09-11 (later) — L-9 resolved, TASK-030 gate blocked

**L-9 was correct as written, but my process was not.** Challenged on it; verified
at `1b5cdf8`. The F-03b plan carries 9 external credits, **5 granting LANGUAGE**
(ap-german-language, ib-french-b, ib-spanish-a, satii-french, alevel-german), so
deleting the ADR-007 rule leaves `language` satisfied by four others and
`total-credits` untouched (ib-spanish-a is credits=0). The golden cannot
discriminate on that clause — exactly L-9's claim, which also explicitly credited
`externalCredit.test.ts:45` as already asserting the rule.

**The real defect is mine and stands:** L-9 came from a subagent measurement I did
NOT re-run before publishing. I re-ran every High/Medium subagent finding and said
so; I did not do that for the Lows, and the verdict does not mark provenance per
finding. **Two standing changes: (1) re-run every measurement I publish regardless
of severity; (2) mark each finding as self-measured or relayed.**

**TASK-030 gate authorised by the manager but BLOCKED — ADR-018 has not landed:**
```
F-13   1 unverifiable (post-matriculation-credits)  <- ADR-018 requires 0
F-13b  2 unverifiable                               <- manager's split specifies 1
F-13c  ABSENT   <- the fixture that proves the constraint discriminates
engine src: no provenance-constrained pessimistic pass
```
Frontend has moved on to TASK-031/032 (`e4a8abf`, wip) while TASK-030 sits at
REVIEW with stale goldens. Raised as a sequencing risk. **Do not gate until F-13c
exists and F-13 reads 0 unverifiable**, or I gate behaviour already superseded.

**Verified as correct, no action:** `docs/review/rounds.md` transcription matches my
verdict exactly (10 tasks); DEBT.md union merge preserved D-01..D-12; ADR-019 is in
protocol section 21; `integrate.sh` now merges `agent/reviewer` last, so evidence
and the ledger reach main.

**When gating TASK-030, be sceptical of F-13c specifically** (manager's own flag): a
rule that quietly returns "agree" for everything passes F-13 and F-13b. F-13c must
show the constraint discriminating, not suppressing.

---

# STATE AS OF 2026-09-11 (v1 gate complete)

## READ THIS FIRST IF YOUR CONTEXT WAS COMPACTED
**ADR-022: re-invoke the four frontend-review skills after a compaction.** The
rule is per session and per new domain, NOT per round — but an invocation you
cannot recall is a memory of guidance, not guidance. Skills invoked this session
(round 1, before the first visual review), and they governed every round since:
`ecc:browser-qa`, `frontend-design:frontend-design`, `ui-ux-pro-max:ui-ux-pro-max`,
`ecc:make-interfaces-feel-better`, plus `ecc:contract-first`, `ecc:security-review`,
`superpowers:verification-before-completion` (before every verdict).

## My standing process rules (learned the hard way this session)
1. **Re-run every measurement I publish, regardless of severity.** L-9 was a
   subagent measurement I shipped without re-running. It happened to be right.
2. **Mark each finding self-measured or relayed.** Marking D-15's unverified half
   redirected an investigation that would otherwise have applied the wrong fix.
3. **Check which code path a fixture exercises before filing "AC unmet".** I
   nearly filed one on ADR-013 after mutating a comparator F-06 never reaches.
4. **I do not write task frontmatter** (ADR-021). Status is the worker's; my
   verdict is the row in `docs/review/rounds.md`, surfaced by INDEX's Last verdict.
5. **Ask rather than decide on audited protocol questions** (ADR-022 came from this).

## The instrument (part of the criterion, ADR-017)
Headless Chrome I launch myself, driven over **raw CDP** — NOT the
chrome-devtools MCP, which is disconnected in this session:
`/Applications/Google Chrome.app/.../Google Chrome --headless=new
--remote-debugging-port=9333 --user-data-dir=<scratch>`
then `Emulation.setDeviceMetricsOverride` and **read `innerWidth`/`innerHeight`
back from the page**. A macOS window resize floors near 500px and fakes both axes.
Helper: `scratchpad/lib.mjs`. AC-V02/V03 are measured at **1440x800**.

## Verdicts issued (ledger is docs/review/rounds.md — the source of truth)
- Round 1: TASK-010..013, 020, 025 CHANGES_REQUIRED; 021..024 APPROVED.
- Round 2: TASK-030 APPROVED; TASK-010..013 APPROVED.
- v1 gate: TASK-031 APPROVED, TASK-033 APPROVED, **TASK-032 CHANGES_REQUIRED**.

## OPEN — what a release gate still needs
1. **V1-H1 (TASK-032, High).** AC-V07: a malformed line is silently dropped.
   Measured: two lines, one valid + one OCR-corrupted (`CSCl O51 PO`) -> preview
   says "1 course understood" with no rejection. AC-V07 now requires three-bucket
   accounting (accepted / rejected-with-reason / consumed-as-context) and zero
   unaccounted. **Not yet fixed** — frontend's only commit since my gate (3305119)
   touches evidence images and status files, not the parser.
2. **TASK-034** — F-15 (D-13: each sharing site independently guarded), D-14
   (stale phase-1 comment), D-17 (desktop map wrap).
3. **H-6, the Registrar question.** 19 courses carry `Measure Values = 2`. The
   pipeline records it and changes nothing, which is right, but a student who
   closed PE with one of them is still told they owe another. **Owner must ask
   the Registrar.** The only open finding that changes a student-visible answer.
4. **AC-B07** — unverifiable: this repo has no git remote, so the nightly
   workflow has never run (D-11/D-12).

## Re-gate rule I am using (see note sent to the manager)
A task sitting at REVIEW is NOT automatically re-gateable: after a
CHANGES_REQUIRED I do not touch status (ADR-021), so it stays REVIEW. Gate only
when the owning branch has commits **newer than my last ledger row** for that
task and they touch the code the finding names. Otherwise a re-gate refiles the
same finding, and protocol 21's recurrence rule would push it to a spurious
ESCALATE.
