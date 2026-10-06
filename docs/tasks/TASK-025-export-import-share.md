---
id: TASK-025
title: Export, import, share link (URL fragment), demo plans, and the no-student-data-leaves-the-browser proof
status: REVIEW
owner: frontend
branch: agent/frontend
priority: HIGH
round: 0
depends_on: [TASK-022]
blocked_on: ""
---

# TASK-025 — Export / import / share

## Objective

Implement `docs/DATABASE.md` §"Storage locations" 2–4: JSON export with the
specified filename, import with preview and explicit replace, a share link
that carries the deflated plan in the **URL fragment** and never in a query
string, fragment import on load with confirm and `replaceState`, six demo
plans, and the evidence that no request ever carries student data.

## Scope

Create only:

```
apps/web/src/share/shareLink.ts        encodePlan(plan: StudentPlan): Promise<string> /* base64url(deflate-raw(JSON)) */; decodePlan(encoded: string): Promise<{ ok: true; plan: StudentPlan } | { ok: false; reason: "corrupt" | "newer" | "invalid"; detail: string }>; SHARE_LINK_WARN_LENGTH = 8000
apps/web/src/share/exportPlan.ts       exportFilename(plan, date: Date): string /* gradguide-plan-2026-2027-2026-09-08.json */; download(plan): void (Blob + object URL, revoked after click)
apps/web/src/share/ExportImport.tsx    footer controls: Export, Import (file input → parse → migratePlan → preview → Replace), Share link (copy; shows "This link contains your own course record. Share it deliberately."; warns over SHARE_LINK_WARN_LENGTH and offers export)
apps/web/src/share/ImportPreview.tsx   course count, matriculation term, student type, exam count, override count; Replace / Cancel
apps/web/src/share/useFragmentImport.ts on mount: if location.hash starts with #plan=, decode → preview → on Replace: replacePlan + history.replaceState(null, "", location.pathname + location.search); on Cancel: replaceState only
apps/web/public/demo/F-01-on-track.json, F-02-transfer.json, F-03-exams.json, F-04-override.json, F-05-one-short.json, F-06-conflict.json   copies of the engine fixture plans (keep them identical; a test asserts equality)
apps/web/src/test/{shareLink,exportPlan}.test.ts
README.md                              ONLY the "Demo" section: add the F-01 share link (generated with encodePlan) — the manager owns the rest of the README
```

## Interfaces

**Consumes:** `usePlan().replacePlan`, `rawStored()`, `migratePlan` (TASK-021);
`StudentPlanSchema`, `PLAN_SCHEMA_VERSION` from shared.

**Produces:** nothing consumed by other tasks. The demo plans are consumed by
the reviewer (AC-D02).

## Tests to write first

1. `shareLink.test.ts`: encode → decode round-trips every demo plan byte-for-byte (`JSON.stringify` equality); tampered base64 → `corrupt`; a plan with `schemaVersion: 2` → `newer`; encoded length for F-01 is under 3000 characters (paste the number).
2. `exportPlan.test.ts`: filename format; exported text parses back to an equal plan.
3. A test that each `public/demo/*.json` deep-equals its `packages/engine/test/fixtures/plans/*.json` counterpart.

## Acceptance Criteria

- [ ] AC-P06: export → hard reload → plan present; import the exported file → `diff` of the two JSON files is empty (paste the commands and output).
- [ ] AC-P07: `docs/review/F-network.txt` lists every request made during: load → import F-01 → open a candidate list → export → copy share link → open the link in a private window. Every request is a same-origin `GET` of `/data/*`, `/demo/*`, a script/style/font asset, or a document; none has a query string or body containing plan data; the share link is shown to be a fragment (`#plan=`).
- [ ] AC-F09: opening the share link in a private window shows the preview, Replace imports an identical plan, and the address bar no longer contains the fragment afterwards.
- [ ] AC-D02: six demo plans exist; the README Demo section carries the F-01 share link; the reviewer can import each through the UI.
- [ ] States: import error (bad file) with the corrupt-plan message and raw download offer; share-link-too-long warning (construct a 200-course plan to trigger it); success confirmation on copy. Screenshots.
- [ ] `typecheck`, `lint`, `test`, `build` pass; console clean.

## Notes

- Skills: `ecc:security-review` before the fragment import (untrusted input: size cap before inflate, schema validation, no `eval`, no `innerHTML`), `ecc:frontend-a11y` (file input labelling, live region for "copied"), `ecc:browser-qa`, `superpowers:requesting-code-review`, `superpowers:verification-before-completion`.
- Use `CompressionStream("deflate-raw")` / `DecompressionStream`; cap the inflated size at 1 MB.
- `history.replaceState` so a reload never re-prompts; never `pushState`.
- Never put plan data in `location.search`. That is the whole point.

## Review History

| Round | Verdict | Summary |
|---|---|---|
