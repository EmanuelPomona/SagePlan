#!/usr/bin/env bash
# What an agent session ACTUALLY invoked, vs. what its handoff claims.
# The only check in the system that catches a fabricated process claim.
#   scripts/audit-skills.sh [worktree-path]
# Exit: 0 corroborated / 1 no transcripts / 3 CLAIMED BUT NOT INVOKED
set -uo pipefail
WT="${1:-$PWD}"
WT="$(cd "$WT" 2>/dev/null && pwd)" || { echo "no such worktree: ${1:-$PWD}" >&2; exit 1; }
SLUG="$(printf '%s' "$WT" | sed 's|^/||; s|/|-|g; s|^|-|')"
python3 - "$HOME/.claude/projects/$SLUG" "$WT" <<'PY'
import json,glob,os,re,sys
d,wt=sys.argv[1],sys.argv[2]
if not os.path.isdir(d):
    print(f"no transcripts for {wt}\n  looked in: {d}\n  (no agent has run in this worktree)")
    sys.exit(1)

rows=[]
for f in glob.glob(os.path.join(d,'*.jsonl')):
    ev=[l for l in open(f,errors='ignore') if l.startswith('{')]
    n=len(ev)
    for i,l in enumerate(ev):
        try: o=json.loads(l)
        except Exception: continue
        c=(o.get('message') or {}).get('content')
        if isinstance(c,list):
            for b in c:
                if isinstance(b,dict) and b.get('type')=='tool_use' and b.get('name')=='Skill':
                    rows.append((round(100*i/max(n,1)),(b.get('input') or {}).get('skill','?')))
rows.sort()
print(f"ACTUALLY INVOKED — {os.path.basename(wt)}  ({len(rows)} call(s))")
print("  position through session -> skill")
for pct,s in rows: print(f"  {pct:3d}%  {s}")
if not rows: print("  (none)")
actual={s for _,s in rows}
short=lambda x: x.split(':')[-1]
seen={short(a) for a in actual}

br=os.popen(f'git -C "{wt}" rev-parse --abbrev-ref HEAD 2>/dev/null').read().strip()
hp=os.path.join(wt,'docs','handoffs',br.replace('/','-')+'.md')
if not os.path.isfile(hp):
    print(f"\nno handoff at docs/handoffs/{br.replace('/','-')}.md — nothing to cross-check yet")
    sys.exit(0)

# Claims live in the "Skills Used" table only. A skill named in prose is not a claim.
text=open(hp,encoding='utf-8',errors='ignore').read()
claimed=set()
for sec in re.split(r'^#{2,4}[ \t]+', text, flags=re.M):
    if not sec.lower().startswith('skills used'): continue
    body=re.split(r'\n#{2,4}[ \t]+', sec)[0]
    for line in body.splitlines():
        if not line.strip().startswith('|'): continue
        cell=line.strip().strip('|').split('|')[0].strip().strip('`').strip()
        if cell.lower() in ('skill','---',''): continue
        if re.fullmatch(r'[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]+)?', cell) and ('-' in cell or ':' in cell):
            claimed.add(cell)

ghosts=sorted(c for c in claimed if c not in actual and short(c) not in seen)
print(f"\nCLAIMED in docs/handoffs/{os.path.basename(hp)}: {len(claimed)}")
for c in sorted(claimed):
    print(f"  {'GHOST ' if c in ghosts else 'OK    '} {c}")
if ghosts:
    print("\nCRITICAL — claimed but absent from the transcript:")
    for g in ghosts: print(f"    {g}")
    print("  AGENT_PROTOCOL section 2: report as CRITICAL against that agent.")
    sys.exit(3)
print("  all claims corroborated by the transcript")
PY
