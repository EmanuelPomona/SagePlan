---
id: TASK-011
title: Registrar GE CSV parser, cross-source GE validator, exclusion-anomaly report
status: REVIEW
owner: backend
branch: agent/backend
priority: HIGH
round: 0
depends_on: [TASK-010]
blocked_on: ""
---

# TASK-011 — Registrar CSV parser and cross-source validators

## Objective

Parse the committed Registrar export
(`data/sources/registrar-ge-export-2026-09-08.csv`: UTF-16 LE, tab-delimited,
CRLF, Tableau long format, 28,845 rows) into per-course GE attribute sets, and
implement validators 3 and 5 from `docs/API.md` §4: cross-source GE agreement
(Coursedog vs Registrar) and exclusion anomalies. Each writes a Markdown report
into `data/reports/` and contributes `ValidationCheck`s.

The Registrar file **validates** the pipeline; it never powers the app (brief §7C).

## Scope

Create only:

```
packages/pipeline/src/registrar/parseCsv.ts      parseRegistrarCsv(buffer: Buffer): RegistrarRow[]   (decode UTF-16 LE incl. BOM, split CRLF, tab fields)
packages/pipeline/src/registrar/pivot.ts         pivotRegistrar(rows): Map<courseKey, { attributes: Set<GeAttribute>, title: string, affiliation: string }>
packages/pipeline/src/validators/geAgreement.ts  checkGeAgreement(catalog: Course[], registrar: Map<...>): { check: ValidationCheck, report: string }
packages/pipeline/src/validators/exclusionAnomalies.ts  checkExclusionAnomalies(catalog: Course[]): { check: ValidationCheck, report: string }
packages/pipeline/src/reports.ts                 writeReport(name, markdown) -> data/reports/<name>.md
packages/pipeline/test/registrar/*.test.ts, test/validators/*.test.ts
packages/pipeline/test/fixtures/registrar-sample.csv   200 rows cut from the real file, re-encoded UTF-16 LE with BOM and CRLF, covering ≥ 5 courses, one with two areas (THEA085 PO), and every Measure Name
```

Modify: `packages/pipeline/src/cli.ts` (wire `validate` to run these two checks; TASK-013 adds the rest).

## Interfaces

**Consumes:** `Course`, `GeAttribute`, `REGISTRAR_GE_LABELS`, `ValidationCheckSchema` from shared; `writeArtefact`, `env` from TASK-010.

**Produces:** `checkGeAgreement`, `checkExclusionAnomalies`, `pivotRegistrar`, `writeReport` for TASK-013's `validate` command and `ValidationReport`.

## Upstream facts (brief §7C, §9)

- Columns: `Course Number`, `Course Title`, `Breadth Area`, `Measure Names`, `Breadth Area Description`, `Language`, `Measure Values`. One row per course × measure; `Measure Values` is `0`/`1`.
- Pivoted: **5,768 distinct courses across 13 campus codes** (PO 1,785, SC 1,010, CM 841, HM 756, PZ 747, KS, JP, CH, JT, AF, AA, JM, BK).
- Expected attribute counts: Area 1 730, Area 2 931, Area 3 776, Area 4 334, Area 5 307, Area 6 292, WI 179, SI 177, AD 140, Language 251, PE 241.
- `Course Number` is a string like `CSCI 062 PO`; parse with `parseCourseKey`. Log and count anything that does not parse.
- Exactly one course carries two Area tags: `THEA085 PO`. Flag it.
- Exclusions the Registrar already applied: senior exercises 190–199 (314 in range, **3** still tagged), `ID 001 PO` (0 tagged), lower-division language < 100 (0 tagged), partial-credit with an Area tag: 89, of which 79 are Area 6 and **10** are not.

## Tests to write first

1. `parseCsv.test.ts`: the UTF-16 fixture decodes; BOM stripped; row count matches; a field containing a comma survives (tab-delimited).
2. `pivot.test.ts`: fixture yields the expected attribute set per course; `THEA085 PO` has two areas; `Measure Values` "0" rows add nothing; the full committed file yields **5,768** courses and the eleven counts above (this test reads the real file; it is fast).
3. `geAgreement.test.ts`: a course tagged AREA_3 in catalog and Area 2 in Registrar → one divergence line naming both; a course only in Registrar (non-PO) → not a divergence; a PO course only in Coursedog with attributes → divergence "missing from Registrar export"; identical sets → pass.
4. `exclusionAnomalies.test.ts`: a 195 course with AREA_1 → listed; a 0.5-credit course with AREA_2 → listed; a 0.5-credit course with AREA_6 → not listed; a course with two Area tags → listed under "two areas".

## Acceptance Criteria

- [ ] AC-B02: the pivot test asserts 5,768 courses and the eleven counts, and passes.
- [ ] AC-B03 (part): `data/reports/exclusion-anomalies.md` lists the 3 senior exercises, the 10 non-Area-6 partial-credit courses and THEA085 PO, each with course key, title, credits and attributes.
- [ ] AC-P09: `data/reports/ge-divergences.md` lists every Coursedog-vs-Registrar divergence for PO courses with a one-line explanation column the owner can fill in; the `ValidationCheck` is `warn` when 1–25 divergences, `fail` above `PIPELINE_MAX_DIVERGENCES`, `pass` at 0. Paste the count.
- [ ] `npm run pipeline:validate` runs both checks and exits non-zero on `fail`.
- [ ] Typecheck, lint, tests pass at root.

## Notes

- Skills: `superpowers:test-driven-development` before the parser and each validator; `ecc:error-handling` for the decode failure path; `superpowers:requesting-code-review`, `superpowers:verification-before-completion`.
- Decode with `TextDecoder("utf-16le")`; do not `require("iconv-lite")`.
- Reports are for the owner: sort by course key, use a Markdown table, include totals at the top, and a "How to resolve" paragraph. The brief's open question #3 is answered by reading this report.
- Neither source is "right". Report; never silently prefer one.

## Review History

| Round | Verdict | Summary |
|---|---|---|
