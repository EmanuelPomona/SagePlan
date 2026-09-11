# Exclusion anomalies

## Population

Courses with `affiliation: "PO"` in the finished catalog: **2004** of 2980 total (AC-B03, ADR-020).

The counts below are **whatever the data says**, recorded as a baseline. They are
not tuned to reach a figure: the v0 criterion's 3 and 10 came from the project
brief's measurement of 2,811 raw Coursedog records, which is a different
population from this 12-campus catalog, and three independent measurements of
"the same" check produced three different answers.

**9** anomaly/anomalies.

- partial credit with a non-Area-6 Area tag (always partial): **5**
- senior exercise (190–199) with an Area tag: **2**
- partial credit with a non-Area-6 Area tag (may be taken at partial credit): **1**
- two areas: **1**

## How to resolve

The catalog states that senior exercises (190–199), independent studies, Critical
Inquiry and lower-division language courses carry no Area tag, and that partial-credit
courses count only toward Area 6. Every row below contradicts one of those rules in
the source data. The engine deliberately applies no exclusion logic of its own, so
these are fixed upstream or accepted as genuine exceptions — not patched in code.

| Course | Title | Credits | Attributes | Anomaly | Tagged by |
|---|---|---|---|---|---|
| CHEM 150 PO | Adv. Synthesis Lab | 0.5 | AREA_4 | partial credit with a non-Area-6 Area tag (always partial) | coursedog |
| CHEM 165 PO | Adv. Biochemistry Lab | 0.5 | AREA_4 | partial credit with a non-Area-6 Area tag (always partial) | coursedog |
| ENGL 195 PO | Criticism: Advanced Methods | 1 | AREA_1 | senior exercise (190–199) with an Area tag | both |
| ENGL 195B PO | Literary Crit: Advd Methods II | 0.5 | AREA_1 | partial credit with a non-Area-6 Area tag (always partial) | both |
| ENGL 195B PO | Literary Crit: Advd Methods II | 0.5 | AREA_1 | senior exercise (190–199) with an Area tag | both |
| GEOL 189V PO | Research Methodologies, Geology | 0.5–1 | AREA_4 | partial credit with a non-Area-6 Area tag (may be taken at partial credit) | both |
| GRMT 180H PO | Germany Black and White | 0.5 | AREA_1 | partial credit with a non-Area-6 Area tag (always partial) | both |
| PHYS 072 PO | Introduc Electricity & Magnetism | 0.5 | AREA_4 | partial credit with a non-Area-6 Area tag (always partial) | both |
| THEA 085 PO | Advanced Lighting Design | 1 | AREA_1, AREA_6 | two areas | registrar |

## Variable-credit sub-group (counted above, listed again here)

These are the `credits.min < 1` cases that are NOT always partial — a course
offered at, say, 0.5-1 credits. They are included in the count above; this
section exists so the owner can tell "always partial" from "may be taken at
partial credit" at a glance, because the two need different conversations.

Why they count: the engine applies no partial-credit exclusion of its own, so
the Registrar's tag is load-bearing. A variable-credit course carrying an Area
tag can be counted toward that Area at half credit, which is precisely where
trusting the tag could produce a wrong answer (reviewer H-4).

| Course | Title | Credits | Attributes |
|---|---|---|---|
| GEOL 189V PO | Research Methodologies, Geology | 0.5–1 | AREA_4 |
