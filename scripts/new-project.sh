#!/usr/bin/env bash
# Create a project from this golden template, with all four worktrees.
#   scripts/new-project.sh StreetSafe-LA
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
source scripts/lib.sh

NAME="${1:-}"
[ -n "$NAME" ] || die "usage: scripts/new-project.sh <ProjectName>"
TPL="$(main_worktree)"; PARENT="$(dirname "$TPL")"; DEST="$PARENT/$NAME"
[ -e "$DEST" ] && die "$DEST already exists"

git clone --quiet "$TPL" "$DEST" || die "clone failed"
cd "$DEST"
git remote remove origin 2>/dev/null || true   # detach from the template

for b in frontend backend reviewer; do
  cap="$(printf '%s' "${b:0:1}" | tr 'a-z' 'A-Z')${b:1}"
  git worktree add "$PARENT/$NAME-$cap" -b "agent/$b" main >/dev/null || die "worktree $b failed"
  echo "created $PARENT/$NAME-$cap  on agent/$b"
done

for br in main agent/frontend agent/backend agent/reviewer; do
  wt="$DEST"; [ "$br" != main ] && wt="$PARENT/$NAME-$(printf '%s' "${br#agent/}" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')"
  s="${br//\//-}"
  printf '# STATUS: %s\nTask: unassigned\nRound: 0\nLast updated: %s\n\n## Skills invoked so far\n\n## Done\n\n## In progress\n\n## Verified\n\n## Blocked on\n- nothing\n' \
    "$br" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$wt/docs/status/$s.md"
done

cd "$DEST" && git add -A && git commit -qm "chore: initialize $NAME from template" && ./scripts/sync.sh >/dev/null 2>&1 || true

cat <<EOF

$NAME created. All four branches start at the same commit.

  cd "$DEST" && scripts/status.sh      # confirm the baseline
  scripts/launch-agents.sh             # the four terminal commands

Manager goes first, alone, until docs/tasks/ has READY tasks.
EOF
