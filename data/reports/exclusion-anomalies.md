# Exclusion anomalies

**8** anomaly/anomalies across 2087 catalog courses.

- partial credit with a non-Area-6 Area tag: **5**
- senior exercise (190–199) with an Area tag: **2**
- two areas: **1**

## How to resolve

The catalog states that senior exercises (190–199), independent studies, Critical
Inquiry and lower-division language courses carry no Area tag, and that partial-credit
courses count only toward Area 6. Every row below contradicts one of those rules in
the source data. The engine deliberately applies no exclusion logic of its own, so
these are fixed upstream or accepted as genuine exceptions — not patched in code.

| Course | Title | Credits | Attributes | Anomaly | Tagged by |
|---|---|---|---|---|---|
| CHEM 150 PO | Adv. Synthesis Lab | 0.5 | AREA_4 | partial credit with a non-Area-6 Area tag | coursedog |
| CHEM 165 PO | Adv. Biochemistry Lab | 0.5 | AREA_4 | partial credit with a non-Area-6 Area tag | coursedog |
| ENGL 195 PO | Criticism: Advanced Methods | 1 | AREA_1 | senior exercise (190–199) with an Area tag | both |
| ENGL 195B PO | Literary Crit: Advd Methods II | 0.5 | AREA_1 | partial credit with a non-Area-6 Area tag | both |
| ENGL 195B PO | Literary Crit: Advd Methods II | 0.5 | AREA_1 | senior exercise (190–199) with an Area tag | both |
| GRMT 180H PO | Germany Black and White | 0.5 | AREA_1 | partial credit with a non-Area-6 Area tag | both |
| PHYS 072 PO | Introduc Electricity & Magnetism | 0.5 | AREA_4 | partial credit with a non-Area-6 Area tag | both |
| THEA 085 PO | Advanced Lighting Design | 1 | AREA_1, AREA_6 | two areas | registrar |
