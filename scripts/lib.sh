#!/usr/bin/env bash
# Shared helpers. Sourced by the other scripts; not run directly.

repo_root() { git rev-parse --show-toplevel 2>/dev/null; }

main_worktree() {
  git worktree list --porcelain | awk '/^worktree /{print $2; exit}'
}

# All worktree paths, one per line.
worktree_paths() {
  git worktree list --porcelain | awk '/^worktree /{print $2}'
}

branch_of() { git -C "$1" rev-parse --abbrev-ref HEAD 2>/dev/null; }

# agent/frontend -> agent-frontend
slug_of() { echo "${1//\//-}"; }

# Deterministic per-branch port offset so several worktrees can run at once.
port_offset() {
  case "$1" in
    main)           echo 0 ;;
    agent/frontend) echo 1 ;;
    agent/backend)  echo 2 ;;
    agent/reviewer) echo 3 ;;
    *)              echo $(( 4 + $(printf '%s' "$1" | cksum | cut -d' ' -f1) % 10 )) ;;
  esac
}

die() { printf 'error: %s\n' "$*" >&2; exit 1; }
