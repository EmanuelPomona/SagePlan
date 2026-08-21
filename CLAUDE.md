d API behavior.

Backend must not silently change request or response formats.

Any API change must update `docs/API.md`.

---

## Database Rules

`docs/DATABASE.md` is the source of truth for database structure.

Schema changes must be documented.

Never delete production-style data or destructive migrations without explicit approval.

---

## Secrets

Never commit:

- API keys
- passwords
- access tokens
- service account credentials
- `.env`
- private certificates

Use environment variables.

Provide `.env.example` when necessary.

---

## MVP Philosophy

For hackathons:

Prefer:

- working functionality
- simple architecture
- fast iteration
- clear user experience
- reliable demo paths

Avoid:

- premature optimization
- unnecessary microservices
- elaborate abstractions
- features outside MVP scope
- large refactors during final integration
- building infrastructure that the demo does not require

---

## Before Coding

Every agent should:

1. Read `CLAUDE.md`.
2. Read its assigned task.
3. Read relevant architecture/API/database documentation.
4. Confirm its branch.
5. Inspect existing code before modifying anything.
6. Identify dependencies on another agent's work.

---

## Definition of Done

A task is not complete simply because code was written.

Before completion:

1. Implementation satisfies the task requirements.
2. Relevant tests pass.
3. Type checking passes if applicable.
4. Linting passes if applicable.
5. Application builds successfully if applicable.
6. No secrets were added.
7. No unrelated files were modified.
8. Documentation is updated when behavior changed.
9. Changes are committed.
10. Integration notes are added to `docs/HANDOFFS.md` when another agent must consume the work.

---

## Communication

Agents communicate through:

- `docs/TASKS.md`
- `docs/HANDOFFS.md`
- `docs/DECISIONS.md`

Do not use documentation as a giant conversation log.

Write concise, structured information that another engineer can act on.

---

## When Blocked

If blocked:

1. Determine the exact blocker.
2. Check project documentation.
3. Check whether another agent owns the dependency.
4. Record the blocker clearly.
5. Avoid inventing an incompatible workaround.
6. Escalate architectural decisions to the manager.

---

## Final Integration

Only the manager/integration owner should combine completed work into `main`.

After integration:

1. install dependencies
2. run tests
3. run lint
4. run typecheck
5. build the application
6. manually verify the primary demo flow
7. fix integration issues
8. deploy~