# Registrar `Measure Values = 2` — double-weighted Physical Education

**19** course(s) carry `Measure Values = 2`, all on `Physical Education`.

## The open question (DEBT D-12)

The task spec stated that `Measure Values` is `0`/`1`. It is `0`, `1` or `2`.
`pivotRegistrar` treats `>= 1` as present, which is the only reason AC-B02's
`PE 241` holds; a literal `=== "1"` reading yields 222.

**What `2` means is not confirmed.** The natural reading is "the Registrar counts
this as two PE courses". But the catalog states the requirement as two physical
education activity courses **in different semesters**, and no weight makes one
course two semesters. So the reading cannot simply be applied.

The pipeline therefore records the fact and changes nothing. If the Registrar
confirms "counts as two", the shape backend proposed is an optional
`attributeWeights` field on `Course` — additive, no `schemaVersion` bump.

Until then a student who satisfied PE with one of these courses is told they
still owe another. That is a known, recorded wrong answer, not a silent one.

| Course | Title |
|---|---|
| DANC 012P PO | Beginning Ballet I |
| DANC 050P PO | Intermediate Modern Dance |
| DANC 051P PO | Intermediate Ballet Technique |
| DANC 120P PO | Modern Technique III |
| DANC 122P PO | Modern Technique IV |
| DANC 124P PO | Advanced Ballet Technique |
| DANC 150C PO | Music & Dance of Bali |
| DANC 151P PO | African Aesthetics |
| DANC 152P PO | Hip-Hop Dance |
| DANC 153P PO | Beginning/Interm Jazz Technique |
| DANC 166P PO | Somatic Movement Techniques |
| DANC 175 PO | Alexander Technique - Group |
| DANC 176 PO | Alexander Technique - Group |
| DANC 180P PO | Dance Repertory |
| DANC 181P PO | Dance Repertory |
| MSL 099 CM | Army Physical Training |
| PE 077E PO | Community Engagement Tennis (CP) |
| PE 080 PO | Comm Engagement Lacrosse (CP) |
| THEA 053HG PO | Alexander Technique - Group |
