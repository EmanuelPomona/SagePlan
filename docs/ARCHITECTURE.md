# System Architecture

## Architecture Status

Draft

---

## System Overview

Describe the overall application architecture.

Example:

User
↓
Next.js Frontend
↓
REST API
↓
FastAPI Backend
↓
PostgreSQL / Supabase
↓
External AI APIs

---

## Frontend

Framework:

Language:

Styling:

State Management:

Authentication:

Deployment:

Primary responsibilities:

- user interface
- user input
- API communication
- loading states
- error states

---

## Backend

Framework:

Language:

Deployment:

Primary responsibilities:

- business logic
- API endpoints
- authentication verification
- database access
- external API calls

---

## Database

Provider:

Database:

Primary entities:

---

## Authentication

Provider:

Authentication flow:

---

## External Services

### Service 1

Purpose:

Environment variables:

Failure behavior:

---

## Directory Structure

```text
frontend/
backend/
tests/
docs/

---

## Model Assignment

Name where the risk actually lives on THIS project, and put the strongest model
there. Do not inherit a default.

| Agent | Model | Effort | Why this project |
|---|---|---|---|
| manager | opus | high | |
| frontend-engineer | | | |
| backend-engineer | | | |
| reviewer | sonnet | high | functional gate; visual findings are advisory |

Opus-on-frontend is right when visual quality decides the outcome (demo-judged
work). It is wrong when correctness does (backend-heavy, data-heavy, or
integration-heavy projects). State the choice and the reason.

---

## Ports and Environment

Assigned per worktree by `scripts/bootstrap.sh` so several agents can run at once.
Never hardcode 3000 or 8000 — read `FRONTEND_PORT` and `BACKEND_PORT` from `.env`.

## Deployed Preview

The reviewer prefers a deployed preview over a local worktree, because it removes
install, ports, `.env`, and database state from the gate's path.

Preview URL (set as `PREVIEW_URL` in `.env`):

## Demo Data

Command that seeds a demonstrable, non-empty state:
