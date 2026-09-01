#!/usr/bin/env bash
# Create a project from this golden template, with all worktrees.
# Every branch starts at the SAME commit and every worktree starts CLEAN.
#   scripts/new-project.sh StreetSafe-LA
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
source scripts/lib.sh

NAME="${1:-}"
[ -n "$NAME" ] || die "usage: scripts/new-project.sh <ProjectName>"
[[ "$NAME" =~ ^[A-Za-z][A-Za-z0-9_-]*$ ]] || die "project name must be alphanumeric/dash/underscore"
TPL="$(main_worktree)"; PARENT="$(dirname "$TPL")"; DEST="$PARENT/$NAME"
[ -e "$DEST" ] && die "$DEST already exists"

git clone --quiet "$TPL" "$DEST" || die "clone failed"
cd "$DEST" || die "cannot enter $DEST"
git remote remove origin 2>/dev/null || true   # detach from the template

BRANCHES=(main agent/frontend agent/backend agent/reviewer)
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Seed every status file on main FIRST, then branch from it. Writing them into
# the worktrees afterwards would leave each one dirty and one commit behind.
mkdir -p docs/status
for br in "${BRANCHES[@]}"; do
  printf '# STATUS: %s\nTask: unassigned\nRound: 0\nLast updated: %s\n\n## Skills invoked so far\n\n## Done\n\n## In progress\n- [ ] awaiting task assignment in docs/tasks/\n\n## Verified\n\n## Blocked on\n- nothing\n' \
    "$br" "$NOW" > "docs/status/${br//\//-}.md"
done
git add -A
git -c user.email="agent@local" -c user.name="template" commit -q -m "chore: initialize $NAME from template"
BASE="$(git rev-parse HEAD)"

for b in frontend backend reviewer; do
  cap="$(printf '%s' "${b:0:1}" | tr 'a-z' 'A-Z')${b:1}"
  git worktree add --quiet "$PARENT/$NAME-$cap" -b "agent/$b" "$BASE" || die "worktree $b failed"
  echo "created $PARENT/$NAME-$cap  on agent/$b"
done

echo
echo "$NAME created at $DEST"
"$DEST/scripts/status.sh"
cat <<EOF

All branches start at the same commit and every worktree is clean.

  cd "$DEST"
  scripts/launch-agents.sh        # the terminal commands

Manager goes first, alone, until docs/tasks/ has READY tasks.
EOF
