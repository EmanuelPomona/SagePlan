# Records excluded from the catalog

3648 candidate course(s) considered; **0** excluded, **0** kept but flagged, 3648 in the catalog.

## Why this file exists

The `status: "Active"` filter only ever applied to Coursedog, so scheduling
placeholders reached the catalog through the Hyperschedule merge and turned up
in the course autocomplete (reviewer M-5). ADR-016 names two exclusion rules —
`department` `TEST`, and a title beginning `DNR:` — and requires anything else
suspicious to be reported rather than silently dropped.

## Excluded

_None._

## Kept, but flagged for a human

These match no named exclusion rule, so they remain in the catalog. If any is
genuinely a placeholder, the fix is a new rule in ADR-016 — not a quiet drop here.

_None._
