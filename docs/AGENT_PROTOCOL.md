# Claude Multi-Agent Operating Protocol V3

This repository runs specialized Claude Code agents, each in its own Git worktree.

Baseline roles:

1. manager   — product, architecture, contracts, task decomposition, integration
2. frontend-engineer
3. backend-engineer
4. reviewer  — independent verification gate

More implementation agents can be added as slices. See section 23.

The objective is software that is correct, coherent, visually intentional,
maintainable, demonstrable, reviewable, and polished enough to show real users,
judges, recruiters, or investors.

This file is the single source of truth for cross-agent policy. Where an agent
definition disagrees with this file, this file wins and the drift is a defect to
report.

---

## 1. SKILL-FIRST RULE

Skills are operating procedures, not optional suggestions.

Before beginning substantive work, determine which installed skills apply. If a
required skill applies, use it.

Do NOT:

- vaguely imitate what you remember a skill saying
- claim to have used a skill that was not loaded/invoked
- skip a relevant skill because the task appears easy
- substitute improvisation for an existing specialized workflow

Do NOT invoke unrelated skills merely to satisfy this rule. Skill usage must be
appropriate to the task.

---

## 2. SKILL EVIDENCE AND AUDIT

Every handoff must include a Skills Used table:

| Skill | Stage invoked | What it actually changed |

If a skill failed to load or run, state that clearly. Never pretend it ran.

**Skill claims are machine-audited.** After every handoff, `scripts/audit-skills.sh`
reads the session transcript and lists the skills actually invoked, with the point
in the session where each was invoked.

A "Skills Used" entry that does not appear in the transcript is a protocol
violation. The reviewer reports it as a CRITICAL finding against the agent that
claimed it.

Do not claim a skill from memory. If you cannot see the invocation in your own
`docs/status/<branch-slug>.md` record, you did not invoke it.

---

## 3. SOURCE-OF-TRUTH DOCUMENTS

| File | Owner | Authoritative for |
|---|---|---|
| `docs/PRODUCT.md` | manager | problem, scope, MVP, demo flow |
| `docs/DESIGN_BRIEF.md` | manager | the product-specific design problem |
| `docs/DESIGN_CONSTRAINTS.md` | manager | visual constraints (the ONLY copy of them) |
| `docs/ARCHITECTURE.md` | manager | stacks, boundaries, model assignment |
| `docs/API.md` + `docs/openapi.yaml` | manager (backend proposes) | the request/response contract |
| `docs/DATABASE.md` | manager (backend proposes) | schema, entities, relationships |
| `docs/ACCEPTANCE.md` | manager | what "done" means |
| `docs/tasks/*.md` | manager | task definition, acceptance criteria |
| `docs/DECISIONS.md` | manager | ADRs for cross-cutting decisions |
| `docs/handoffs/<branch>.md` | that branch's agent | integration information for consumers |
| `docs/status/<branch>.md` | that branch's agent | durable working state (section 20) |
| `docs/review/` | reviewer | verification evidence (section 22) |
| `docs/review/rounds.md` | reviewer | the `round` counter — source of truth (section 21) |
| `docs/DEBT.md` | reviewer | accepted, unfixed findings |

**Read only what your role needs.** Each agent definition lists its own read set.
Reading everything is a context tax, not diligence.

---

## 4. CONTRACT OWNERSHIP

Manager owns scope, architecture, cross-agent contracts, acceptance criteria,
task boundaries, and integration.

Frontend owns client implementation, visual system, interaction, responsive
behavior, frontend state.

Backend owns APIs, persistence, domain logic, validation, server reliability.

Reviewer owns independent verification, the QA verdict, and defect reporting.

**No agent silently changes a cross-agent contract.** The non-silent procedure is
in section 6.

---

## 5. DEFINITION OF DONE

This is the only Definition of Done in the repository. Implemented is not done.
No agent may claim completion without verification.

1. Implementation satisfies the task's acceptance criteria, quoted by ID.
2. Relevant tests pass — paste the command and its result.
3. Typecheck passes, if the stack has one.
4. Lint passes, if the stack has one.
5. The application builds.
6. The service starts and the primary flow works end to end.
7. Errors are handled; failure states exist.
8. API implementation matches `docs/API.md` and `docs/openapi.yaml`.
9. Responsive behavior verified at the three widths in section 9 (frontend).
10. Interface states in section 8 are present (frontend).
11. Browser console is clean of errors.
12. No secrets added; `git diff` reviewed for credentials.
13. No unrelated files modified.
14. Documentation updated where behavior changed.
15. `docs/status/<branch-slug>.md` reflects the finished state.
16. `docs/handoffs/<branch-slug>.md` written for consumers.
17. Changes committed.

Invoke `superpowers:verification-before-completion` immediately before declaring
work finished — and do no further implementation work after it. If you keep
working, you must invoke it again. A verification that is followed by more edits
verified nothing.

---

## 6. CONTRACT CHANGE PROCEDURE

If the contract in `docs/API.md` or `docs/DATABASE.md` is wrong or insufficient,
you may not quietly implement something else. Do this instead:

1. Implement against the contract as written where possible, even if imperfect.
2. Write the proposed change to `docs/handoffs/<your-branch-slug>.md` under a
   `## CONTRACT CHANGE REQUEST` heading: current shape, proposed shape, why, and
   what breaks if it is not changed.
3. Set the task's `status: BLOCKED` and `blocked_on: contract` in its
   `docs/tasks/<id>.md` frontmatter.
4. Commit and push so the request is visible outside your session.
5. Continue with unaffected work.

The manager resolves contract change requests at integration and updates the
contract documents. Only the manager edits a contract another agent consumes.

---

## 7. REAL CONTENT RULE

Build with realistic product content wherever feasible. Do not ship finished
interfaces filled with generic placeholder text.

---

## 8. FRONTEND STATE COVERAGE

Relevant interfaces must account for: default, loading, empty, success, error,
disabled, hover, focus, active/pressed.

---

## 9. RESPONSIVE REQUIREMENT

Inspect and capture evidence at: desktop ~1440px, tablet ~768px, mobile ~390px.

Do not merely shrink the desktop layout. Mobile is designed, not derived.

---

## 10. REVIEWER INDEPENDENCE

The reviewer does not trust implementation claims. It verifies them.

Handoff documents are claims, not evidence. Treat every statement in a handoff as
a hypothesis to falsify.

**Frontend approval requires runtime evidence — without exception.** A green test
suite cannot approve a frontend. A successful build cannot approve a frontend.
Source inspection cannot approve a frontend.

If runtime evidence could not be produced, the verdict is BLOCKED, never
APPROVED. "Browser tooling was unavailable" is a reason to block, not a reason to
approve. See section 22.

---

## 11. REVIEW VERDICTS

| Verdict | Meaning |
|---|---|
| `APPROVED` | All applicable gates passed with evidence. |
| `APPROVED-WITH-DEBT` | Only Medium/Low findings remain. They are moved to `docs/DEBT.md`. Round 3 only. |
| `CHANGES_REQUIRED` | A Critical or High **functional** finding exists. |
| `BLOCKED` | Required verification could not be performed. State exactly what prevented it. |
| `ESCALATE` | A defect survived three rounds, or a finding recurred. A human decides. |

**Severity gate.** Any Critical or High FUNCTIONAL finding produces
CHANGES_REQUIRED. Visual findings are reported but are advisory: they never block
on their own. Taste disputes escalate to the human, who owns them.

---

## 12. NO SILENT FAILURE

If dependency installation, browser tooling, credentials, tests, skills, or
builds fail: state the limitation clearly.

Never convert "I could not verify this" into "this works."

---

## 13. DEBUGGING

Invoke `superpowers:systematic-debugging` before non-trivial debugging — bugs,
failing tests, regressions, unexplained behavior.

---

## 14. TESTING

Invoke `superpowers:test-driven-development` for any logic with branching rules,
validation, calculation, or parsing. "When appropriate" has historically resolved
to "never" under time pressure, so the bar is concrete instead:

Write tests first for: validation rules, business calculations, parsers, state
machines, permission checks, anything that returns different results for different
inputs.

Tests are optional for: pure wiring, static layout, one-line pass-throughs.

---

## 15. BRANCH DISCIPLINE

Each implementation agent works only inside its assigned branch and worktree.

Baseline branches: `main`, `agent/frontend`, `agent/backend`, `agent/reviewer`.
Slice branches take the form `agent/<slice-id>`.

Your branch slug is your branch name with `/` replaced by `-`
(`agent/frontend` -> `agent-frontend`). It names your handoff and status files.

Never write to another agent's handoff, status, or source directory.

---

## 16. HANDOFF FORMAT

This is the only handoff schema in the repository. All agents use it. Write it to
`docs/handoffs/<your-branch-slug>.md`, appending a new dated section per handoff.

```markdown
## HANDOFF-<n> — <branch> — <ISO date>

### Summary
### Tasks Completed
TASK-IDs, each with the acceptance criteria it satisfies.
### Files Changed
### Contracts
API/schema/component interfaces another agent consumes. State "none" if none.
### Skills Used
| Skill | Stage invoked | What it actually changed |
### Verification
Commands run and their results. Artifact paths. Not adjectives.
### What Was NOT Verified
Explicitly. This section may not be empty without justification.
### Known Issues
### Commit
```

Note the `What Was NOT Verified` section. It is required for every agent, not
just the reviewer. It is the most useful line in any handoff.

---

## 17. PRIORITY ORDER

1. correctness
2. core user flow
3. reliability
4. usability
5. visual clarity
6. visual distinctiveness
7. polish
8. optional flourish

---

## 18. RUNTIME SKILL INVOCATION CONTRACT

A skill appearing in an agent's configuration or in the Skill registry does NOT
count as having used it.

When this protocol says a skill is mandatory:

1. Explicitly invoke it with the Skill tool before the stage it governs.
2. Follow the loaded instructions.
3. Apply its output to the work.
4. Record it in `docs/status/<branch-slug>.md` at the moment you invoke it.
5. Report it in the handoff.

"Available", "registered", "listed", and "preloaded" are not evidence of usage.

If a mandatory skill cannot be invoked: stop that stage when the skill is
essential, report the failure, and do not claim compliance.

### Mandatory timing

Skills are invoked at the stage where they matter, not at startup:

- brainstorming BEFORE product decisions
- frontend-design BEFORE major UI implementation
- ui-ux-pro-max BEFORE establishing or substantially changing the UI system
- systematic-debugging BEFORE attempting non-trivial bug fixes
- requesting-code-review AFTER implementation verification, BEFORE handoff
- verification-before-completion IMMEDIATELY BEFORE claiming completion, with no
  implementation work after it

Do not invoke all skills at project startup and then ignore them. The audit in
section 2 records invocation position and will show it.

### Invocation is per session and per new domain, not per round

A skill is invoked when you need its guidance, **never to raise a counter**.
Re-invoking identical static guidance inside one session, so that an audit shows
two invocations instead of one, is the invocation theatre section 1 forbids — it
is the same defect as claiming a skill you did not run, pointed the other way.

- Invoke when the stage is new to you in this session, or the material is a kind
  you have not applied the skill to.
- Do **not** re-invoke for round 2 of the same material. Say in the handoff which
  invocation covers which round, so the audit's count is explicable.
- **Do** re-invoke if your context was compacted since, because then you no
  longer have the guidance and the earlier invocation is only a memory of one.

A handoff claiming a skill it did not invoke is a CRITICAL finding. A handoff
invoking a skill it did not need is a quieter failure of the same kind, and the
reviewer should say so rather than reward the count.

---

## 19. VISUAL CONSTRAINTS

The visual constraints live in exactly one file: `docs/DESIGN_CONSTRAINTS.md`.

They are not restated here, in agent definitions, or in `CLAUDE.md`. If you find a
second copy anywhere, that copy is stale by definition — delete it and keep the
canonical file.

Frontend reads it before design work. Reviewer reads it before visual review.

---

## 20. DURABLE WORKING STATE

Your context will be compacted. Assume it.

Maintain `docs/status/<branch-slug>.md` and update it AS YOU WORK, not at handoff
time. Copy the template from `docs/status/README.md`.

```markdown
# STATUS: <branch>
Task: TASK-XXX
Round: N
Last updated: <ISO timestamp>

## Skills invoked so far
- <skill> @ <stage> -> <what it changed>

## Done
- [x] <verified step, with the command or artifact that proves it>

## In progress
- [ ] <current step, and the next concrete action>

## Verified
- <claim> -> <evidence: command output, artifact path, or commit>

## Blocked on
- <blocker, or "nothing">
```

If you resume with a summarized context: **read this file FIRST.** It, not your
context summary, is the record.

Never report a skill as used, or a claim as verified, unless it appears in this
file. A summarized context is not evidence.

---

## 21. LOOP CONTROL

Every task carries a `round` counter. It lives in **`docs/review/rounds.md`**, the
reviewer-owned ledger, and the reviewer appends a row per verdict.

It used to live in each task's frontmatter, where it could not survive: section 21
makes the reviewer the incrementer, section 3 makes `docs/tasks/*.md`
manager-owned, and section 15 keeps the reviewer on a branch that
`scripts/integrate.sh` did not merge. Every increment was stranded, `main` read
`round: 0` for tasks already gated, and the escalation safeguard below could never
fire. `scripts/integrate.sh` now merges `agent/reviewer` last, and
`scripts/tasks.sh` reads the ledger for `docs/tasks/INDEX.md` (ADR-019).

**One field, one owner.** The reviewer records its verdict in `docs/review/rounds.md`
and **does not edit task frontmatter at all** — not `status`, not `round`. The
worker owns `status:` (its declaration of what it has done); the manager owns the
rest of the file. Two owners writing one field through `merge=union` produces a
duplicate key that `scripts/tasks.sh` resolves silently, which is measured and
real (ADR-021); `tasks.sh` now fails loudly if it ever happens. `INDEX.md` shows
the worker's status and the reviewer's last verdict side by side, so neither has
to overwrite the other to be seen.

- **Rounds 1-2:** normal verdicts.
- **Round 3:** `CHANGES_REQUIRED` is no longer available. The reviewer must issue
  `APPROVED-WITH-DEBT` (Medium/Low remaining, moved to `docs/DEBT.md`) or
  `ESCALATE` (a Critical/High defect survived three rounds).
- **Recurrence:** if a finding is materially the same as one filed in a previous
  round for the same task, **and the worker has since declared a fix attempt**,
  do not refile it. Issue `ESCALATE` immediately. A finding that survives two
  fix attempts is a specification or comprehension problem, not a fix problem,
  and a fourth attempt will not resolve it.

  **Recurrence counts fix attempts, not gates.** Refiling a finding the worker
  has not yet had a chance to address is not recurrence, and escalating it would
  be an artefact of bookkeeping rather than a fact about the code (ADR-023).

### Telling a fresh REVIEW from a stale one

Since ADR-021 the reviewer does not write `status:`, so a task it sends back
stays at `REVIEW` until its owner picks it up. `REVIEW` alone therefore cannot
distinguish *awaiting a first gate* from *gated, sent back, not yet fixed*. Two
mechanisms settle it, and the second is sound even when the first is forgotten:

1. **The worker declares.** On picking up a task after `CHANGES_REQUIRED`, set
   `status: IN_PROGRESS`; set it back to `REVIEW` when re-declaring. This is the
   worker's own field, so it costs nothing and makes `INDEX.md` truthful in the
   meantime.
2. **The ledger records what was gated.** Each row in `docs/review/rounds.md`
   carries the **commit** of the owning branch at the moment of the verdict. The
   reviewer gates a task at `REVIEW` only when that branch's head differs from
   its last ledger row for the task. Same head means nothing has happened since
   the gate, so the `REVIEW` is stale.

Where both are available and disagree, the ledger commit wins: it is a fact
about the repository rather than a declaration someone may have forgotten to
make.

An `ESCALATE` must state the defect, the attempted fixes, and a hypothesis for why
they failed.

---

## 22. EVIDENCE REQUIREMENTS

Claims that require artifacts, not prose:

| Claim | Required evidence |
|---|---|
| Frontend works | `docs/review/R-01-desktop-1440.png`, `R-02-tablet-768.png`, `R-03-mobile-390.png` |
| States covered | `docs/review/R-NN-state-<empty\|error\|loading>.png`, one per claimed state |
| Console clean | `docs/review/R-console.txt` for the primary flow |
| Tests pass | Pasted command and output |
| Contract matches | `scripts/contract-test.sh` output |
| Skills invoked | `scripts/audit-skills.sh` output |

Name any screenshot that shows a defect with a `-DEFECT` suffix.

Missing evidence is not a formatting problem. It means the claim is unverified,
and an unverified claim cannot pass a gate.

---

## 23. SCALING BEYOND FOUR AGENTS

Role-based splitting (frontend/backend) stops working once a feature spans both.
Beyond the baseline four, add agents as **slices**, not roles.

A slice is one user-facing capability, owned end to end — its UI, its endpoint,
its query. Two agents working different slices touch different directories, so
their branches merge cleanly and no human resolves conflicts at 3am.

To add one:

```bash
scripts/new-agent.sh <slice-id>     # creates worktree + agent/<slice-id> branch
```

Then assign tasks with `owner: <slice-id>` in the task frontmatter. Nothing else
in the system needs to change: handoffs, status files, and evidence are already
per-branch.

The test for a good slice: **can its owner demo it without any other agent's work
being finished?** If not, the slice boundary is wrong.
