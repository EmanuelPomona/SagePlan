#!/usr/bin/env bash
# Mechanical subset of docs/DESIGN_CONSTRAINTS.md. Advisory: never blocks.
# Roughly 8 of the 22 patterns are greppable; the rest need judgment.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
python3 - "${1:-frontend}" <<'PY'
import os,re,sys
root=sys.argv[1]
if not os.path.isdir(root): sys.exit(f"no such directory: {root}")
EXT={'.tsx','.jsx','.ts','.js','.css','.scss','.html','.vue','.svelte'}
SKIP={'node_modules','.git','dist','build','.next','coverage','__pycache__'}
RULES=[
 ("pure white canvas",        r'#fff\b|#ffffff\b|bg-white\b|background:\s*white'),
 ("default identity font",    r'font-family:[^;]*(Inter|Geist|Space Grotesk)|font-(inter|geist)\b'),
 ("decorative drop shadow",   r'box-shadow|\bshadow-(sm|md|lg|xl|2xl)\b'),
 ("glassmorphism",            r'backdrop-filter|backdrop-blur'),
 ("gradient",                 r'linear-gradient|radial-gradient|bg-gradient-to'),
 ("em dash in UI copy",       r'—'),
 ('"It\'s not X, it\'s Y"',   r"[Ii]t.s not .{3,40}, it.s "),
 ("emoji as icon",            r'[\U0001F300-\U0001FAFF✨⭐⚡]'),
 ("dot-grid / grid bg",       r'radial-gradient\([^)]*circle[^)]*\)|background-image:[^;]*grid'),
]
hits={n:[] for n,_ in RULES}
for dp,dn,fn in os.walk(root):
    dn[:]=[d for d in dn if d not in SKIP]
    for f in fn:
        if os.path.splitext(f)[1] not in EXT: continue
        p=os.path.join(dp,f)
        try: lines=open(p,encoding='utf-8',errors='ignore').read().splitlines()
        except Exception: continue
        for i,l in enumerate(lines,1):
            for name,pat in RULES:
                if re.search(pat,l): hits[name].append(f"{p}:{i}: {l.strip()[:96]}")
total=0
for name,_ in RULES:
    h=hits[name]
    if not h: continue
    total+=len(h)
    print(f"\n[{name}]  {len(h)} hit(s)")
    for x in h[:6]: print("  "+x)
    if len(h)>6: print(f"  ... and {len(h)-6} more")
print(f"\n{total} mechanical hit(s) across {root}/")
print("Advisory. Each hit needs removal OR a justification recorded in docs/DESIGN_BRIEF.md")
print("under 'Justified exceptions'. This does not replace the judgment questions in")
print("docs/DESIGN_CONSTRAINTS.md section 5 — most of the constraints are not greppable.")
PY
