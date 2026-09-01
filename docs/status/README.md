# Working State

One file per branch: `docs/status/<branch-slug>.md`.

**This exists because your context will be compacted.** When it is, this file —
not your context summary — is the record of what you did. Update it as you work,
not at handoff time.

Never report a skill as used, or a claim as verified, unless it appears here.

---

## Template

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
