# API Contract

Prose contract. The machine-readable twin is `docs/openapi.yaml`, which
`scripts/contract-test.sh` enforces. **Both must change together** — a prose-only
change is not enforced, and a spec-only change is invisible to whoever reads this.

Manager owns both. Backend proposes changes via `docs/AGENT_PROTOCOL.md` section 6.

## Base URL

Development:

Production:

---

# Endpoints

## Health Check

### GET `/api/health`

Purpose:

Verify that the backend is running.

Response:

```json
{
  "status": "ok"
}
