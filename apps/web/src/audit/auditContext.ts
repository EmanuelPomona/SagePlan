import { createContext, useContext } from "react";
import type { Result } from "@sageplan/shared";

/**
 * Every result, available to any row.
 *
 * A candidate row needs to know what OTHER requirements a course would close,
 * which means the whole audit, not just its own row. Passing it down through
 * every intermediate component would couple them all to a question only the
 * leaf asks.
 */
export const AuditResultsContext = createContext<Result[]>([]);

export function useAuditResults(): Result[] {
  return useContext(AuditResultsContext);
}
