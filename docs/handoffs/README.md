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

```markdown
## HANDOFF-<n> — <branch> — <ISO date>

### Summary
### Tasks Completed
### Files Changed
### Contracts
### Skills Used
| Skill | Stage invoked | What it actually changed |
### Verification
### What Was NOT Verified
### Known Issues
### Commit
```

To request a contract change, add a `## CONTRACT CHANGE REQUEST` section — see
protocol section 6.
