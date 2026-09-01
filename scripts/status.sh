#!/usr/bin/env bash
# One screen: where every agent is. Replaces carrying commit hashes by hand.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
source scripts/lib.sh

printf '%-20s %-9s %-6s %-6s %-6s %s\n' BRANCH HEAD AHEAD DIRTY ROUND "CURRENT TASK"
printf '%.0s-' {1..82}; echo

while IFS= read -r wt; do
  br="$(branch_of "$wt")"; [ -z "$br" ] && continue
  head="$(git -C "$wt" rev-parse --short HEAD)"
  ahead="$(git -C "$wt" rev-list --count main.."$br" 2>/dev/null || echo 0)"
  dirty="$(git -C "$wt" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
  sf="$wt/docs/status/$(slug_of "$br").md"
  task="-"; round="-"
  if [ -f "$sf" ]; then
    task="$(grep -m1 '^Task:'  "$sf" | sed 's/^Task:[[:space:]]*//'  | cut -c1-32)"
    round="$(grep -m1 '^Round:' "$sf" | sed 's/^Round:[[:space:]]*//' | cut -c1-4)"
    blocked="$(awk '/^## Blocked on/{f=1;next} f&&/^-/{print;exit}' "$sf" | sed 's/^-[[:space:]]*//')"
    case "$blocked" in ""|nothing|Nothing|none|None) ;; *) task="BLOCKED: ${blocked:0:24}" ;; esac
  fi
  printf '%-20s %-9s %-6s %-6s %-6s %s\n' "${br:0:20}" "$head" "$ahead" "$dirty" "${round:--}" "${task:--}"
done < <(worktree_paths)

echo
if [ -f docs/tasks/INDEX.md ]; then
  echo "Tasks awaiting review:"
  grep -E '\| *REVIEW *\|' docs/tasks/INDEX.md | sed 's/^/  /' || echo "  none"
fi
