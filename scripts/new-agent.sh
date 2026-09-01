#!/usr/bin/env bash
# Add a slice agent: a new worktree + agent/<slice-id> branch, level with main.
# A slice is one user-facing capability owned end to end (UI + endpoint + query),
# which is why two slice agents rarely touch the same files.
#   scripts/new-agent.sh search
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
source scripts/lib.sh

SLICE="${1:-}"
[ -n "$SLICE" ] || die "usage: scripts/new-agent.sh <slice-id>    e.g. search"
[[ "$SLICE" =~ ^[a-z][a-z0-9-]*$ ]] || die "slice id must be lowercase kebab-case"
[ "$(branch_of .)" = "main" ] || die "run this from the main worktree (on branch main)"
[ -z "$(git status --porcelain)" ] || die "main has uncommitted changes — commit first"

ROOT="$(main_worktree)"; NAME="$(basename "$ROOT")"
CAP="$(printf '%s' "${SLICE:0:1}" | tr 'a-z' 'A-Z')${SLICE:1}"
DEST="$(dirname "$ROOT")/${NAME}-${CAP}"
BR="agent/$SLICE"

git show-ref --verify --quiet "refs/heads/$BR" && die "branch $BR already exists"
[ -e "$DEST" ] && die "$DEST already exists"

# Seed the status file on main first, so the new branch starts level with
# everyone else instead of one commit ahead.
printf '# STATUS: %s\nTask: unassigned\nRound: 0\nLast updated: %s\n\n## Skills invoked so far\n\n## Done\n\n## In progress\n- [ ] awaiting task assignment in docs/tasks/\n\n## Verified\n\n## Blocked on\n- nothing\n' \
  "$BR" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "docs/status/$(slug_of "$BR").md"
git add "docs/status/$(slug_of "$BR").md"
git -c user.email="agent@local" -c user.name="template" commit -q -m "chore: add slice agent $SLICE"

git worktree add --quiet "$DEST" -b "$BR" HEAD || die "worktree creation failed"
./scripts/sync.sh >/dev/null 2>&1 || true   # bring the other worktrees level

cat <<EOF

created  $DEST   on $BR

Next:
  1. Manager assigns tasks with 'owner: $SLICE' in docs/tasks/*.md
  2. cd "$DEST" && scripts/bootstrap.sh
  3. claude --agent frontend-engineer     (or backend-engineer, whichever fits the slice)

The slice test: can its owner demo it without any other agent's work being
finished? If not, the boundary is wrong — see AGENT_PROTOCOL section 23.
EOF
