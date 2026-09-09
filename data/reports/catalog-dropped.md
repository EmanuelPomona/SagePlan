# Records dropped during catalog ingestion

2812 upstream record(s) -> 2087 course(s).

- not Active (administrative placeholders and test rows): **577**
- refused by the normaliser: **2**

Non-Active records are expected: Coursedog carries Banked and Inactive rows
such as `PE WAIVER` and `TEST001 PO`. The rows below are different — they
look like courses but could not be represented, so each is a real loss.

| Course | Reason | Detail |
|---|---|---|
| MUS10/20/100 | unparseable-id | subjectCode=MUS code=MUS10/20/100 |
| ENGL195B PO | empty-title | name is empty |
