# Handoffs

One file per branch: `docs/handoffs/<branch-slug>.md`, where the slug is the
branch name with `/` replaced by `-` (`agent/frontend` -> `agent-frontend`).

**Write only to your own file.** A shared handoff document guarantees a merge
conflict between branches, and a human has to resolve it. `.gitattributes` marks
these files `merge=union` so concurrent appends combine.

Append a new dated section per handoff, using the single schema in
`docs/AGENT_PROTOCOL.md` section 16.

Move sections older than the current round to `docs/archive/` — every agent reads
these files, so unbounded growth is a context tax paid by everyone.

---

## Schema

The handoff schema is defined once, in `docs/AGENT_PROTOCOL.md` section 16. It is
deliberately not restated here — a second copy is a second thing to drift.

Two sections people skip and should not:

- `### Skills Used` — a table, one row per skill, with the stage it was invoked at
  and what it actually changed. `scripts/audit-skills.sh` cross-checks this table
  against the session transcript, and a row with no matching invocation is a
  CRITICAL finding.
- `### What Was NOT Verified` — required. It may not be empty without
  justification. It is the most useful line in any handoff.

To request a contract change, add a `## CONTRACT CHANGE REQUEST` section — see
`docs/AGENT_PROTOCOL.md` section 6.
