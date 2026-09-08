#!/usr/bin/env bash
# Implementation vs the contract. On this project the contract is
# packages/shared (zod schemas); docs/openapi.yaml is generated from it and the
# "implementation" is the set of JSON artefacts in /data plus the web app that
# serves them. There is no HTTP server to probe.
#
# Exit 0: openapi.yaml current AND every artefact present validates.
# Exit 1: something is invalid or stale.
# Exit 2: could not verify (pipeline artefacts not generated yet). Never a pass.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

[ -d node_modules ] || { echo "--- npm install"; npm install --no-audit --no-fund >/dev/null || { echo "NOT VERIFIED: npm install failed"; exit 2; }; }

echo "--- docs/openapi.yaml current with packages/shared?"
npx tsx packages/shared/scripts/emit-openapi.ts --check || exit 1

echo; echo "--- /data artefacts vs schemas (and every sourceQuote verbatim)"
npx tsx packages/shared/scripts/validate-artefacts.ts; rc=$?

if [ -f .env ]; then set -a; . ./.env; set +a; fi
PORT="${FRONTEND_PORT:-}"
if [ -n "$PORT" ] && curl -fsS --max-time 3 "http://localhost:$PORT/data/manifest.json" -o /tmp/gradguide-manifest.json 2>/dev/null; then
  echo; echo "--- dev server at :$PORT serves /data/manifest.json ($(wc -c < /tmp/gradguide-manifest.json) bytes)"
else
  echo; echo "NOTE dev server not running (FRONTEND_PORT=${PORT:-unset}); served-path check skipped. Files on disk were checked above."
fi

case $rc in
  0) echo; echo "CONTRACT OK" ;;
  2) echo; echo "NOT VERIFIED: generated artefacts missing (run the pipeline). Hand-written data and openapi.yaml are valid." ;;
  *) echo; echo "CONTRACT FAILED" ;;
esac
exit $rc
