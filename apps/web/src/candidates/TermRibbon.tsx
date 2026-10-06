import { termCode } from "@sageplan/shared";
import type { RibbonCell } from "./selectors.ts";

/**
 * Eight terms, filled where the course actually ran.
 *
 * This is the product's most differentiated asset made visible: no official
 * tool can draw it, and "has this run recently?" is the question behind
 * "should I plan on it being offered next year?".
 */
export function TermRibbon({ cells }: { cells: RibbonCell[] }) {
  if (cells.length === 0) return null;
  const offered = cells.filter((c) => c.offered);
  const label = `offered in ${offered.length} of the last ${cells.length} terms: ${
    offered.length === 0 ? "none" : offered.map((c) => termCode(c.term)).join(", ")
  }`;

  return (
    <span className="ribbon" role="img" aria-label={label}>
      {cells.map((cell) => (
        <span key={termCode(cell.term)} className={`ribbon-cell${cell.offered ? " is-offered" : ""}`} aria-hidden="true">
          <span className="ribbon-mark" />
          <span className="ribbon-label">
            {cell.term.term}
            {String(cell.term.year).slice(2)}
          </span>
        </span>
      ))}
    </span>
  );
}
