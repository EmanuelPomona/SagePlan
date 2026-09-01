#!/usr/bin/env bash
# Make THIS worktree runnable: deps, .env with non-colliding ports, seed data.
# Fixes: gitignored .env never arriving via merge, port collisions, empty DB.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
source scripts/lib.sh

BR="$(branch_of .)"; OFF="$(port_offset "$BR")"
FE=$(( 3000 + OFF )); BE=$(( 8000 + OFF ))

echo "worktree : $PWD"
echo "branch   : $BR"
echo "ports    : frontend $FE / backend $BE"

if [ ! -f .env ]; then
  [ -f .env.example ] || die ".env.example missing — the manager has not written it"
  cp .env.example .env
  echo "created .env from .env.example"
fi

# Ports are per-worktree and always rewritten; secrets are never touched.
python3 - "$FE" "$BE" <<'PY'
import re,sys
fe,be=sys.argv[1],sys.argv[2]
s=open('.env').read()
def setk(s,k,v):
    if re.search(rf'^{k}=',s,re.M): return re.sub(rf'^{k}=.*$',f'{k}={v}',s,flags=re.M)
    return s.rstrip()+f'\n{k}={v}\n'
s=setk(s,'FRONTEND_PORT',fe); s=setk(s,'BACKEND_PORT',be)
s=setk(s,'VITE_API_BASE_URL',f'http://localhost:{be}')
open('.env','w').write(s)
PY
echo "wrote ports into .env (secrets untouched)"

[ -f package.json ]           && { echo "--- npm install ---";  npm install --silent || echo "WARN npm install failed"; }
[ -f requirements.txt ]       && { echo "--- pip install ---";  python3 -m pip install -q -r requirements.txt || echo "WARN pip install failed"; }
[ -f backend/requirements.txt ] && { python3 -m pip install -q -r backend/requirements.txt || echo "WARN backend pip install failed"; }

if [ -f package.json ] && grep -q '"seed"' package.json; then
  echo "--- seeding demo data ---"; npm run seed --silent || echo "WARN seed failed"
else
  echo "NOTE no 'seed' script. The reviewer will see an empty app — add one."
fi

MISSING=$(grep -E '^[A-Z_]+=$' .env | grep -vE '^(PREVIEW_URL|FRONTEND_PORT|BACKEND_PORT)=' || true)
[ -n "$MISSING" ] && { echo; echo "UNSET (fill before running):"; echo "$MISSING" | sed 's/^/  /'; }
echo; echo "ready. source .env before starting anything."
