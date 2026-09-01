#!/usr/bin/env bash
# Pull main into every agent worktree. Reports conflicts instead of hiding them.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
source scripts/lib.sh

fail=0
tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT

while IFS= read -r wt; do
  br="$(branch_of "$wt")"
  [ -z "$br" ] && continue
  [ "$br" = "main" ] && continue

  if [ -n "$(git -C "$wt" status --porcelain)" ]; then
    echo "SKIP     $br  (uncommitted changes — commit before syncing)"; echo x >> "$tmp"; continue
  fi
  if git -C "$wt" merge --no-edit main >/dev/null 2>&1; then
    echo "OK       $br  -> $(git -C "$wt" rev-parse --short HEAD)"
  else
    echo "CONFLICT $br"
    git -C "$wt" diff --name-only --diff-filter=U | sed 's/^/           /'
    echo "           resolve in $wt, then: git add -A && git commit"
    echo x >> "$tmp"
  fi
done < <(worktree_paths)

[ -s "$tmp" ] && fail=1
exit $fail
