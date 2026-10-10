# Records excluded from the catalog

3005 candidate course(s) considered; **5** excluded, **0** kept but flagged, 3000 in the catalog.

## Why this file exists

The `status: "Active"` filter only ever applied to Coursedog, so scheduling
placeholders reached the catalog through the Hyperschedule merge and turned up
in the course autocomplete (reviewer M-5). ADR-016 names two exclusion rules —
`department` `TEST`, and a title beginning `DNR:` — and requires anything else
suspicious to be reported rather than silently dropped.

## Excluded

| Course | Affiliation | Title | Rule |
|---|---|---|---|
| TEST 001 PZ | PZ | Test Course-Disregard | department TEST is a scheduling placeholder (ADR-016) |
| TEST 001 SC | SC | DNR: Add No Restrictions | department TEST is a scheduling placeholder (ADR-016) |
| TEST 002 PZ | PZ | Test Course--Disregard | department TEST is a scheduling placeholder (ADR-016) |
| TEST 002 SC | SC | DNR: All Restrictions Cleared | department TEST is a scheduling placeholder (ADR-016) |
| TEST 003 SC | SC | DNR: Unless Section is Closed | department TEST is a scheduling placeholder (ADR-016) |

## Kept, but flagged for a human

These match no named exclusion rule, so they remain in the catalog. If any is
genuinely a placeholder, the fix is a new rule in ADR-016 — not a quiet drop here.

_None._
