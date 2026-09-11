#!/usr/bin/env bash
# Merge worker branches into main in a fixed order. Stops on the first conflict.
# Run from the main worktree. Manager territory.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
source scripts/lib.sh

[ "$(branch_of .)" = "main" ] || die "run this from the main worktree (on branch main)"
[ -z "$(git status --porcelain)" ] || die "main has uncommitted changes — commit or stash first"

# Backend before frontend: the contract producer lands before its consumer.
ordered=(agent/backend agent/frontend)
while IFS= read -r b; do
  case "$b" in agent/backend|agent/frontend|agent/reviewer|main) ;; *) ordered+=("$b") ;; esac
done < <(git for-each-ref --format='%(refname:short)' refs/heads | grep '^agent/' | sort)

for br in "${ordered[@]}"; do
  git show-ref --verify --quiet "refs/heads/$br" || continue
  n="$(git rev-list --count "main..$br" 2>/dev/null || echo 0)"
  if [ "$n" -eq 0 ]; then echo "skip   $br (nothing new)"; continue; fi
  echo "merge  $br ($n commits)"
  if git merge --no-edit "$br" >/dev/null 2>&1; then
    echo "  ok   -> $(git rev-parse --short HEAD)"
  else
    echo "  CONFLICT in:"
    git diff --name-only --diff-filter=U | sed 's/^/    /'
    echo
    echo "  Resolve by hand. Contract files resolve toward docs/API.md."
    echo "  Lockfiles are marked -merge: regenerate them, do not hand-merge."
    echo "  Then: git add -A && git commit && scripts/integrate.sh"
    exit 1
  fi
done

# The reviewer LAST. Its branch carries the round ledger, the screenshot evidence
# and docs/DEBT.md, none of which reach main any other way (ADR-019). By this
# point the worker commits it merged for review are already here, so this adds
# only reviewer-authored work.
if git show-ref --verify --quiet refs/heads/agent/reviewer; then
  n="$(git rev-list --count main..agent/reviewer 2>/dev/null || echo 0)"
  if [ "$n" -eq 0 ]; then
    echo "skip   agent/reviewer (nothing new)"
  else
    echo "merge  agent/reviewer ($n commits) — round ledger, review evidence, DEBT"
    if git merge --no-edit agent/reviewer >/dev/null 2>&1; then
      echo "  ok   -> $(git rev-parse --short HEAD)"
    else
      echo "  CONFLICT in:"
      git diff --name-only --diff-filter=U | sed 's/^/    /'
      echo "  The reviewer only writes docs/review/, docs/DEBT.md and verdicts."
      echo "  A conflict outside those paths means it edited something it does not own."
      exit 1
    fi
  fi
fi

./scripts/tasks.sh >/dev/null 2>&1 && echo "task index regenerated from the round ledger"

echo
echo "integrated. now verify before handing to the reviewer:"
echo "  scripts/bootstrap.sh && scripts/contract-test.sh"
echo "  <project build / test / lint / typecheck>"
echo "  scripts/sync.sh          # push main out to the reviewer worktree"
