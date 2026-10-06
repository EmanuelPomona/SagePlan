# Persistence — SagePlan

## Provider

**None.** There is no database and no server. Student academic data never
leaves the browser (`docs/PRODUCT.md`, "Explicitly Out of Scope"; brief §11).

This document is still the schema contract for what *is* persisted: the
student's plan in the browser, the exported file, and the share link. Frontend
owns the implementation; the manager owns the shape, which is `StudentPlan` in
`packages/shared/src/plan.ts`.

---

# Entities

## StudentPlan (the only persisted entity)

Schema: `StudentPlan` (`docs/openapi.yaml#/components/schemas/StudentPlan`).

| Field | Type | Required | Notes |
|---|---|---|---|
| schemaVersion | `1` (literal) | yes | bump on any breaking shape change; see Migrations |
| catalogYear | `CatalogYear` | yes | which catalog the plan was built against |
| matriculationTerm | `TermId` | yes | drives `sinceMatriculation` filters and transfer pre-matriculation rules |
| studentType | `firstYear \| transfer` | yes | drives `appliesWhen` waivers and transfer Breadth policy |
| completed | `CompletedCourse[]` | yes | course, term, grade, gradeMode, provenance; `title`/`credits`/`attributes` for courses not in the catalog |
| planned | `PlannedCourse[]` | yes | empty in P0; reserved for the P2 planner |
| externalCredits | `ExternalCredit[]` | yes | already resolved by `resolveExternalCredit`; re-resolved on load if the rules file changed |
| attestations | `Record<string, boolean>` | yes | requirementId or attested-rule id → confirmed |
| overrides | `Override[]` | yes | chair-granted substitutions |
| declarations | `{ programId, kind }[]` | yes | empty in P0 |

There is no `id`, no `createdAt`, no owner: one browser profile holds one plan.

---

# Storage locations

## 1. `localStorage`

| Key | Value | Notes |
|---|---|---|
| `sageplan:plan:v1` | JSON `StudentPlan` | written on every change, debounced ≤ 250 ms; read once on load |
| `sageplan:ui:v1` | JSON `{ theme?: "light" \| "dark" \| "system", openRequirementIds?: string[], upcomingTerm?: TermCode }` | per-device conveniences; losing it must not lose data |

Until 2026-10 the app was called GradGuide and used `gradguide:plan:v1` and
`gradguide:ui:v1`. On load each key falls back to its `gradguide:` predecessor
when the `sageplan:` key is empty; the first write removes the old key. The
rename therefore costs nobody a saved plan.

Rules:

- Every read is wrapped: a missing key, a parse error, or a schema failure
  renders the **corrupt-plan state** with an offer to download the raw stored
  string and start fresh. Nothing is silently discarded.
- The key name carries the major version so a future incompatible shape can
  live beside the old one during migration.
- Quota errors (Safari private mode) surface as a visible, specific warning:
  "Your plan could not be saved in this browser. Export it before closing."

## 2. Export file

`sageplan-plan-<catalogYear>-<YYYY-MM-DD>.json`, MIME `application/json`,
content exactly the `StudentPlan` JSON, pretty-printed with two spaces. Import
accepts any file that parses and passes `StudentPlanSchema` after migration,
and previews the plan (course count, matriculation term, student type) before
replacing the current one. Importing never merges; it replaces, after an
explicit confirm.

## 3. Share link

```
https://<host>/#plan=<base64url( deflate-raw( JSON.stringify(plan) ) )>
```

- The plan lives in the **URL fragment**, which browsers never send to the
  server, so a static host's access logs never contain a student's record. This
  is a privacy requirement, not a convenience. Query strings are forbidden for
  plan data.
- `deflate-raw` via the browser's `CompressionStream`; a 32-course plan is
  roughly 1–2 KB encoded. Links longer than 8 000 characters show a warning and
  offer the export file instead.
- On load, when `#plan=` is present the app decodes, validates, previews, and
  asks before replacing the stored plan. It then clears the fragment
  (`history.replaceState`) so a reload does not re-prompt.
- Copying a share link shows: "This link contains your own course record. Share
  it deliberately."

## 4. Demo plans

`apps/web/public/demo/*.json`: one `StudentPlan` per engine fixture in
`docs/ACCEPTANCE.md` (on-track, transfer, exam-heavy, override, one-short,
conflict). Importable through the normal import control, and the README carries
a share link for the on-track plan so the reviewer never sees an empty app.

---

# Migrations

`schemaVersion` is `1`. Frontend maintains `migratePlan(raw: unknown): StudentPlan`:

1. Read `raw.schemaVersion`. If it is greater than `PLAN_SCHEMA_VERSION`,
   refuse with "This plan was made with a newer version of SagePlan" and offer
   the download of the raw string.
2. Apply migrations `v1 → v2 → …` in order (none exist yet; the function and
   its test exist from day one so the first real migration is a diff, not a
   design).
3. Parse with `StudentPlanSchema`. Failure → corrupt-plan state.
4. Re-resolve every `externalCredits[]` entry through `resolveExternalCredit`
   with the current rules file, so a rules correction reaches existing plans.

Tests: a fixture per historical version once one exists; for now, a test that
`migratePlan` round-trips every demo plan and rejects `schemaVersion: 2`.

---

# Relationships

```text
StudentPlan
 ├── completed[]       -> CourseId (resolved against /data/catalog.json at evaluation time; not stored)
 ├── externalCredits[] -> ExamSubject.key in /data/external-credit-rules.json
 ├── overrides[]       -> Requirement.id in /data/programs/*.json
 ├── attestations{}    -> Requirement.id or attested Rule.id
 └── declarations[]    -> Program.id (empty in P0)
```

No student data is ever joined on a server. Every reference is resolved in the
browser against the static artefacts in `docs/API.md`.

---

# What is deliberately not stored

Grades, GPA, completed-course lists, transcript uploads, student ids and names
never leave the browser, and **no analytics of any kind** are collected, because
aggregate events could reconstruct them. Safe to ship publicly: the catalog,
program encodings, GE rules, section and offering data.
