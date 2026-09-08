import type { Settlement } from "./settlement.ts";

/**
 * The Rule union is complete in P0 but only the P0 kinds are evaluated
 * (docs/ARCHITECTURE.md, rule 3). A deferred kind is a first-class
 * `unverifiable`, never a crash and never a silent false negative.
 */
export function settleDeferred(kind: string): Settlement {
  return {
    status: "unverifiable",
    satisfiedBy: [],
    remaining: null,
    candidates: [],
    note: `rule kind '${kind}' not yet supported`,
  };
}
