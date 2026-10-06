---
id: TASK-001
title: Shared contract package (zod schemas, codecs, OpenAPI emitter, artefact validator)
status: DONE
owner: manager
branch: main
priority: HIGH
round: 0
depends_on: []
blocked_on: ""
---

# TASK-001 — Shared contract package

## Objective

`packages/shared` is the single authoritative artifact for every boundary on the
project (`docs/API.md` §"The authoritative artifact"). Done in the planning
session by the manager, who is its only editor.

## Scope

- `packages/shared/src/{ids,rule,catalog,program,plan,result,grades,artefacts,registry,index}.ts`
- `packages/shared/scripts/{emit-openapi,validate-artefacts}.ts`
- `packages/shared/test/*.test.ts`
- `docs/openapi.yaml` (generated)

## Acceptance Criteria

- [x] `npx tsc -p packages/shared/tsconfig.json` passes
- [x] `npx vitest run --root packages/shared` passes (13 tests)
- [x] `npx tsx packages/shared/scripts/emit-openapi.ts --check` reports current
- [x] `npx eslint .` passes
- [x] `docs/API.md` §1–§2 describe exactly these schemas

## Notes

Workers consume it as `@sageplan/shared` (source exports, no build step).
Changes go through `docs/AGENT_PROTOCOL.md` §6.

## Review History

| Round | Verdict | Summary |
|---|---|---|
