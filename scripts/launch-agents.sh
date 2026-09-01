#!/usr/bin/env bash
# Print (or open, with --open on macOS) the four agent terminal commands.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
source scripts/lib.sh

declare -a CMDS=() LABELS=()
while IFS= read -r wt; do
  br="$(branch_of "$wt")"; [ -z "$br" ] && continue
  case "$br" in
    main)           a=manager ;;
    agent/frontend) a=frontend-engineer ;;
    agent/backend)  a=backend-engineer ;;
    agent/reviewer) a=reviewer ;;
    *)              a=frontend-engineer ;;   # slice agents: pick per slice
  esac
  LABELS+=("$br"); CMDS+=("cd \"$wt\" && scripts/bootstrap.sh && claude --agent $a")
done < <(worktree_paths)

echo "Four sessions. Manager goes first and alone until docs/tasks/ has READY tasks."
echo
for i in "${!CMDS[@]}"; do printf '# %s\n%s\n\n' "${LABELS[$i]}" "${CMDS[$i]}"; done

if [ "${1:-}" = "--open" ] && [ "$(uname)" = "Darwin" ]; then
  for c in "${CMDS[@]}"; do
    osascript -e "tell application \"Terminal\" to do script \"$c\"" >/dev/null
  done
  echo "opened $(( ${#CMDS[@]} )) Terminal windows"
else
  echo "(re-run with --open to launch these in Terminal on macOS)"
fi
