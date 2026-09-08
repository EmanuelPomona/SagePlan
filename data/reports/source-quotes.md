# Source quotes

34 quote(s) checked against 10 committed snapshot(s).
**0** failure(s), **3** warning(s).

## How to resolve

A FAILURE means an encoded requirement quotes text the committed snapshot does
not contain — the rule and the catalog disagree, and the rule is wrong until
proven otherwise. This gate works offline and is the one that matters.

A WARNING means the live page could not be fetched, or a quote that still
matches the snapshot was not found on the live page — the catalog has probably
moved on. Re-take the snapshot and re-read the affected rules.

## Warnings

- degree-requirements-tab-general-education-requirements: none of its 23 quote(s) appear in the served HTML, so this page's text is rendered client-side and cannot be verified live; the committed snapshot remains the gate
- degree-requirements-tab-credit-requirements: none of its 6 quote(s) appear in the served HTML, so this page's text is rendered client-side and cannot be verified live; the committed snapshot remains the gate
- degree-requirements-tab-grade-point-average-requirement: none of its 1 quote(s) appear in the served HTML, so this page's text is rendered client-side and cannot be verified live; the committed snapshot remains the gate
