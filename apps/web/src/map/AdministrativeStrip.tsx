import type { Requirement, Result } from "@gradguide/shared";
import { ADMINISTRATIVE } from "./families.ts";

/**
 * Totals, on one line.
 *
 * These are real requirements, but they are about arithmetic rather than
 * choice: they resolve themselves as courses are added and no student plans a
 * semester around them. A node each would have cost a third of the map to say
 * something nobody acts on.
 */
export function AdministrativeStrip({
  requirements,
  results,
  onOpen,
}: {
  requirements: Requirement[];
  results: Result[];
  onOpen: (requirementId: string) => void;
}) {
  const byId = new Map(requirements.map((r) => [r.id, r]));
  const shown = ADMINISTRATIVE.map((id) => ({ requirement: byId.get(id), result: results.find((r) => r.requirementId === id) }))
    .filter((x): x is { requirement: Requirement; result: Result } => x.requirement !== undefined && x.result !== undefined)
    .filter((x) => x.result.waived !== true);

  if (shown.length === 0) return null;

  return (
    <p className="admin-strip">
      {shown.map(({ requirement, result }) => (
        <button
          key={requirement.id}
          type="button"
          className={`admin-item admin-${result.status}`}
          onClick={() => onOpen(requirement.id)}
          aria-label={`${requirement.label}, ${result.status}${result.remaining ? `, ${result.remaining.n} ${result.remaining.unit} to go` : ""}`}
        >
          <span className="admin-figure">{figure(result)}</span>
          <span className="admin-label">{shortLabel(requirement.label)}</span>
        </button>
      ))}
    </p>
  );
}

/** Reads as a sentence: "12.75 more  course credits", "done  credits at Pomona". */
function figure(result: Result): string {
  if (result.status === "satisfied") return "done";
  if (result.status === "unverifiable") return "unknown";
  return result.remaining ? `${result.remaining.n} more` : result.status;
}

/** "32 course credits" is the rule's name; the strip already shows the number. */
function shortLabel(label: string): string {
  return label.replace(/^\d+(\.\d+)?\s+/, "");
}
