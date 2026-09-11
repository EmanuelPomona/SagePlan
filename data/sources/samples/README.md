# Transcript samples — local only, never committed

`data/sources/samples/` is gitignored (except this file). Put a real Pomona
unofficial transcript here and it stays on your machine: the app reads
transcripts in the browser and uploads nothing (ADR-012), and the repository
never carries one.

Needed to unblock the PDF tier of ADR-012. Until a sample exists, the transcript
feature ships as paste-only (TASK-032).
