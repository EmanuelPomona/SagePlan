#!/usr/bin/env bash
# Raw material for docs/RETRO.md. Judgment is yours; the numbers are here.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
source scripts/lib.sh

echo "=============== RETRO INPUT: $(basename "$(main_worktree)") ==============="
echo
echo "--- rounds per task (1 = gate too soft, 4+ = tasks under-specified) ---"
python3 - <<'PY'
import glob,re,statistics
rs=[]
for p in sorted(glob.glob('docs/tasks/*.md')):
    if 'INDEX' in p or 'TASK-000' in p: continue
    t=open(p,errors='ignore').read()
    m=re.match(r'^---\n(.*?)\n---',t,re.S)
    if not m: continue
    fm=dict(re.findall(r'^([a-z_]+):\s*(.*)$',m.group(1),re.M))
    try: r=int(fm.get('round','0'))
    except ValueError: r=0
    rs.append(r); print(f"  {fm.get('id','?'):10s} round={r} status={fm.get('status','?')}")
if rs: print(f"\n  median={statistics.median(rs)}  max={max(rs)}  escalated(>=3)={sum(1 for r in rs if r>=3)}")
else:  print("  no tasks")
PY

echo
echo "--- accepted debt ---"
[ -f docs/DEBT.md ] && grep -c '^| 2' docs/DEBT.md 2>/dev/null | sed 's/^/  rows: /' || echo "  none"

echo
echo "--- contract change requests ---"
grep -rl 'CONTRACT CHANGE REQUEST' docs/handoffs/ 2>/dev/null | sed 's/^/  /' || echo "  none"

echo
echo "--- skill audit per worktree (claimed vs invoked) ---"
while IFS= read -r wt; do
  br="$(branch_of "$wt")"; [ "$br" = "main" ] && continue
  echo "  == $br =="
  ./scripts/audit-skills.sh "$wt" 2>&1 | sed 's/^/    /' | head -20
done < <(worktree_paths)

echo
echo "--- commits by branch ---"
git for-each-ref --format='%(refname:short)' refs/heads | while read -r b; do
  printf '  %-18s %s\n' "$b" "$(git rev-list --count "$b" 2>/dev/null)"
done

echo
echo "Now write docs/RETRO.md. Only findings with a template consequence belong there."
