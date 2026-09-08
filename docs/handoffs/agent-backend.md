# Handoffs — agent/backend

## CONTRACT CHANGE REQUEST — TASK-010 — 2026-09-08

Raised before implementation, per `docs/AGENT_PROTOCOL.md` §6 and TASK-010's own
instruction ("do not widen it: file a CONTRACT CHANGE REQUEST with a real example
record"). Everything below is measured from a live authenticated fetch of the
2,811-record Coursedog payload, not inferred.

**Reproduce:**
```
curl -sS -H 'Origin: https://catalog.pomona.edu' \
 'https://app.coursedog.com/api/v1/cm/pomona/courses/search/$filters?catalogId=eziiW38FfLsoDlBqEZgV&skip=0&limit=3000&orderBy=catalogDisplayName&formatDependents=false&ignoreEffectiveDating=true'
-> http=200, listLength=2811
```

---

### Item 1 — AC-B01's "≥ 2,700 courses" cannot be met without shipping junk records

**Current contract.** TASK-010 AC-B01: "`npm run pipeline:catalog` writes
`data/catalog.json` with ≥ 2,700 courses". The figure comes from brief §7A's
measured 2,811, which counted the raw payload.

**What the data actually contains.** The payload is not 2,811 courses. It carries
a `status` field the brief did not model:

| status | count |
|---|---|
| Active | 2,235 |
| Banked | 458 |
| Inactive | 118 |
| **total** | **2,811** |

The non-Active records are administrative placeholders and test rows, not
courses. Real examples, verbatim:

| code | name | status |
|---|---|---|
| `PE WAIVER` | "PE Waiver" | Banked |
| `REG PENDING` | "Registration Pending" | Banked |
| `OVERLAYWI` | "Writing Intensive Overlay" | Banked |
| `FOR LANG REQ` | "Foreign Language Req Fulfilled" | Banked |
| `AWAY` | "F/T Enrollment - Away from PO" | Banked |
| `TEST001 PO` | "Your Course 101" | Inactive |
| `TEST003 PO` | "This is a test (3)" | Inactive |
| `TEST099 PO` | "BALL testing" | Banked |

29 of these have no `subjectCode` at all and cannot produce a `CourseId`.

**Every candidate filter, measured against the threshold:**

| filter | courses | ≥2,700? | junk kept |
|---|---|---|---|
| no filter (`all`) | 2,811 | yes | 6+ |
| `status = Active` | 2,235 | **no** | 0 |
| `catalogPrint = true` | 2,177 | no | 6+ |
| `Active` + `catalogPrint` | 2,031 | no | 0 |
| `status != Inactive` | 2,693 | **no** | 5 |

After also removing the 142 duplicate records in Item 2, an honest Pomona catalog
is **≈ 2,093 courses**.

**No filter that excludes the junk reaches 2,700.** The threshold is satisfiable
only by shipping `PE WAIVER` and `Your Course 101` into the catalog the frontend
feeds to course autocomplete (TASK-022).

**Proposed change.** Replace AC-B01's count assertion with:

- ingest `status === "Active"` only, and record the excluded counts by status in
  the log and in `data/reports/`;
- assert **≥ 2,000 PO courses** as the non-empty sanity floor (still catching a
  truncated or broken fetch, which is what the guard is for);
- keep the zero-course and HTTP 401/403 hard-fail guards exactly as written.

**Reason.** The engine's correctness is the product's whole trust proposition
(ARCHITECTURE.md §Model Assignment). A catalog containing "Registration Pending"
produces nonsense autocomplete entries and a nonsense denominator.

**Consequence if unchanged.** I cannot mark AC-B01 met. Either the catalog ships
known-junk records, or the acceptance criterion fails on a correct
implementation. I will not resolve that silently in either direction.

---

### Item 2 — 139 duplicate course records; the obvious tie-break loses GE attributes on 55 courses

**Current contract.** Not addressed. `CatalogArtefact.courses` is a flat array;
nothing says a `courseKey` is unique, and nothing says which record wins.

**What the data contains.** Among Active records, 139 `subjectCode + courseNumber`
groups hold more than one record (142 extra records). They are catalog editions,
distinguished only by a year suffix on `_id`. Real example, both Active:

```json
{ "_id": "POLI161 PO -2023", "code": "POLI161 PO", "name": "Comparative Social Policy",
  "attributes": ["PO Area 2 Requirement ;PO Writing Intensive Req;Asian Studies ;International Relations ;Politics"] }

{ "_id": "POLI161 PO -2024", "code": "POLI161 PO", "name": "Comparative Social Policy",
  "attributes": [] }
```

Measured across all 139 groups:

- 83 groups agree on GE attributes — any pick is safe.
- **56 groups disagree.**
- In **55 of those 56**, choosing the highest `_id` year (the intuitive
  "newest wins") **discards the GE attributes** and keeps the empty record.

`_id` suffixes among Active records: 2023 -> 1,834, 2024 -> 115, none -> 286. The
2024 edition is partial, not newer-and-better.

**Proposed change.** Add to `docs/API.md` §CatalogArtefact: *"`courseKey(course.id)`
is unique within `courses`. Where the upstream catalog carries several editions of
one course, the pipeline keeps the most complete record: most GE attributes first,
then non-empty description, then highest `_id` edition. The discarded records are
listed in `data/reports/catalog-duplicates.md`."*

**Reason.** There is no defensible mechanical "latest wins" rule here — latest is
emptier. Silently picking wrong marks 55 courses as carrying no GE attribute,
which makes the engine answer `unmet` for requirements a student has actually
satisfied. That is the silent-correctness failure this project is organised to
prevent, and it is a cross-agent decision because frontend consumes the result.

**Consequence if unchanged.** Any implementation picks *some* winner. Without a
stated rule the choice is invisible, untested, and wrong for 55 courses.

**Interim behaviour (so work continues, per §6 step 1).** I will implement the
proposed most-complete rule, emit `data/reports/catalog-duplicates.md`, and cover
it with a test. If the manager rules differently, only `dedupe.ts` changes.

---

### Item 3 — two smaller shape facts (no contract change needed; recorded so the reviewer can check them)

1. **`credits` has two upstream shapes, not one.** Brief §7A says
   `{repeatable, numberOfRepeats, creditHours:{min,max}}`, "100% populated". 182
   Active records instead carry `{repeatable, creditHours:{value, operator}, billingHours:{…}}`
   — no `min`/`max`, no `numberOfRepeats`. Example: `MUS092 PO`
   ("Linguistic Elements of Music"), `creditHours: {"value":1,"operator":""}`.
   Handled in the normaliser as `min = max = value`; `CourseSchema.credits` already
   fits, so this is mine to absorb, not a contract change. None of the 182 carries
   a GE attribute.
2. **`attributes[]` entries are semicolon-delimited composites**, not single tags:
   `"PO Area 2 Requirement ;All Government/Politics ;Politics"`. `COURSEDOG_ATTRIBUTE_MAP`
   is therefore keyed on the **split-and-trimmed token**, which is what TASK-010's
   `Record<string, GeAttribute>` signature supports unchanged. 106 distinct tokens;
   the complete Pomona GE vocabulary is the 12 `PO …` tokens below, plus
   `PO DDP Courses` (76) which is dropped exactly as Hyperschedule's `1DDP` is.

   | Coursedog token | GeAttribute | n |
   |---|---|---|
   | `PO Area 1 Requirement` | AREA_1 | 454 |
   | `PO Area 2 Requirement` | AREA_2 | 364 |
   | `PO Area 3 Requirement` | AREA_3 | 301 |
   | `PO Area 4 Requirement` | AREA_4 | 179 |
   | `PO Area 5 Requirement` | AREA_5 | 100 |
   | `PO Area 6 Requirement` | AREA_6 | 223 |
   | `PO Writing Intensive Req` | WRITING_INTENSIVE | 173 |
   | `PO Speaking Intensive` | SPEAKING_INTENSIVE | 198 |
   | `PO Analyzing Difference` | ANALYZING_DIFFERENCE | 125 |
   | `PO Language Requirement` | LANGUAGE | 130 |
   | `PO Phys Ed Requirement` | PHYSICAL_EDUCATION | 181 |
   | `PO Community Partnership` | COMMUNITY_PARTNERSHIP | 27 |

   **Guard caveat the manager should know:** TASK-010 says fail on any unmapped
   token containing "Area", "Intensive", "Analyzing", "Language" or "Physical".
   Two *non-GE* tokens trip that: `All Languages` (209, a subject grouping) and
   `Physical Education` (155, a department grouping — the real GE token is
   `PO Phys Ed Requirement`, which contains neither "Physical" nor "Area"). I am
   implementing the guard with an explicit, commented known-non-GE allowlist for
   those two, so a genuinely new token such as "PO Area 9 Requirement" still fails
   the build. Flagging it because it slightly changes the guard's shape.

3. **One Active record has an empty `name`**: `ENGL195B PO`. `CourseSchema.title`
   is `z.string().min(1)`, so it cannot be represented. I will drop it and count it
   as a normalise issue in the log rather than invent a title. Say if you want a
   placeholder instead.

---

### Status

TASK-010 set to `BLOCKED`, `blocked_on: contract`, on Item 1 (the acceptance
threshold, which I cannot honestly meet) and Item 2 (a correctness policy that is
the manager's to own). TASK-011/012/013 are not independently blocked; they depend
on TASK-010.

Per §6 step 5 I am continuing with the unaffected work: `env`, `http`, `write`,
`meta`, `raw`, `attributeMap`, `normalise`, `csvFallback`, `cli` and their tests.
None of that changes under either resolution.
