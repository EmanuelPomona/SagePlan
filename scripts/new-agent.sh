#!/usr/bin/env bash
# Add a slice agent: a new worktree + agent/<slice-id> branch.
# A slice is one user-facing capability owned end to end (UI + endpoint + query),
# which is why two slice agents rarely touch the same files.
#   scripts/new-agent.sh search
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
source scripts/lib.sh

SLICE="${1:-}"
[ -n "$SLICE" ] || die "usage: scripts/new-agent.sh <slice-id>    e.g. search"
[[ "$SLICE" =~ ^[a-z][a-z0-9-]*$ ]] || die "slice id must be lowercase kebab-case"

ROOT="$(main_worktree)"; NAME="$(basename "$ROOT")"
DEST="$(dirname "$ROOT")/${NAME}-$(printf '%s' "${SLICE:0:1}" | tr 'a-z' 'A-Z')${SLICE:1}"
BR="agent/$SLICE"

git show-ref --verify --quiet "refs/heads/$BR" && die "branch $BR already exists"
[ -e "$DEST" ] && die "$DEST already exists"

git worktree add "$DEST" -b "$BR" main || die "worktree creation failed"

cat > "$DEST/docs/status/$(slug_of "$BR").md" <<EOF
# STATUS: $BR
Task: unassigned
Round: 0
Last updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Skills invoked so far

## Done

## In progress
- [ ] await task assignment in docs/tasks/

## Verified

## Blocked on
- nothing
EOF

cat <<EOF

created  $DEST   on $BR

Next:
  1. Manager assigns tasks with 'owner: $SLICE' in docs/tasks/*.md
  2. cd "$DEST" && scripts/bootstrap.sh
  3. claude --agent frontend-engineer     (or backend-engineer, whichever fits the slice)

The slice test: can its owner demo it without any other agent's work being
finished? If not, the boundary is wrong — see AGENT_PROTOCOL section 23.
EOF
