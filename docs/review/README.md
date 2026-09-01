# Review Evidence

Verification artifacts. Committed on purpose — they are the difference between a
verified claim and an asserted one.

| Prefix | Produced by | Meaning |
|---|---|---|
| `F-` | frontend-engineer | self-QA before handoff |
| `R-` | reviewer | gate evidence |

Required for a frontend APPROVED (protocol section 22):

```
R-01-desktop-1440.png
R-02-tablet-768.png
R-03-mobile-390.png
R-NN-state-<empty|error|loading>.png
R-console.txt
```

Suffix any screenshot showing a defect with `-DEFECT`, e.g.
`R-06-markers-after-zoom-DEFECT.png`.

If these do not exist, the frontend has not been verified, and an unverified
frontend cannot be APPROVED. The verdict is BLOCKED.
