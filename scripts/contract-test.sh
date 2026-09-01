#!/usr/bin/env bash
# Implementation vs docs/openapi.yaml. Exits non-zero when it cannot verify,
# so "could not run" is never mistaken for "passed".
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
SPEC="docs/openapi.yaml"
[ -f "$SPEC" ] || { echo "NOT VERIFIED: $SPEC does not exist yet"; exit 2; }
[ -f .env ] && set -a && . ./.env && set +a
BASE="${1:-http://localhost:${BACKEND_PORT:-8000}}"

if ! curl -fsS --max-time 5 "$BASE/api/health" >/dev/null 2>&1; then
  echo "NOT VERIFIED: no service answering at $BASE"
  echo "  start the backend (scripts/bootstrap.sh, then run it) and retry."
  exit 2
fi
echo "service up at $BASE"

if command -v schemathesis >/dev/null 2>&1; then
  echo "--- schemathesis ---"; schemathesis run "$SPEC" --base-url "$BASE" --checks all
elif command -v st >/dev/null 2>&1; then
  echo "--- schemathesis (st) ---"; st run "$SPEC" --base-url "$BASE" --checks all
else
  echo "schemathesis not installed — falling back to a documented-path smoke test."
  echo "  full contract testing: pip install schemathesis"
  python3 - "$SPEC" "$BASE" <<'PY'
import sys,re,subprocess
spec,base=sys.argv[1],sys.argv[2]
paths=re.findall(r'^\s{2}(/[^\s:]+):', open(spec,errors='ignore').read(), re.M)
if not paths: sys.exit("NOT VERIFIED: no paths parsed from spec")
bad=0
for p in paths:
    if '{' in p: print(f"  SKIP  {p} (needs a parameter)"); continue
    code=subprocess.run(['curl','-o','/dev/null','-s','-w','%{http_code}','--max-time','5',base+p],
                        capture_output=True,text=True).stdout
    ok = code and code[0] in '234'
    print(f"  {'OK  ' if ok else 'FAIL'}  {code:>3}  {p}")
    bad += 0 if ok else 1
print(f"\n{len(paths)} documented path(s), {bad} unreachable")
print("NOTE: this is reachability only, NOT schema conformance.")
sys.exit(1 if bad else 0)
PY
fi
