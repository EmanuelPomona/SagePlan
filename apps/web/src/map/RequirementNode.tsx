import { courseKey, sameCourse } from "@sageplan/shared";
import { EXAM_PSEUDO_ID } from "@sageplan/engine";
import type { ExternalCredit, Requirement, Result } from "@sageplan/shared";
import { verdictOf, type Verdict } from "../audit/StatusGlyph.tsx";

/**
 * One requirement, as a ring.
 *
 * State is the ring's fill, never hue alone: the label beneath spells it out
 * and the aria-label says it in words. Family is carried by position and by the
 * heading above, never by the node's colour, because hue on a node already
 * means state and it can only mean one thing at a time.
 */
export function RequirementNode({
  requirement,
  result,
  externalCredits,
  offeredNextTerm,
  termLabel,
  onOpen,
}: {
  requirement: Requirement;
  result: Result;
  externalCredits: ExternalCredit[];
  offeredNextTerm: number | null;
  termLabel: string | null;
  onOpen: () => void;
}) {
  const verdict = verdictOf(result);
  const beneath = underLabel(result, verdict, externalCredits, offeredNextTerm, termLabel);

  return (
    <button
      type="button"
      className={`node node-${verdict}`}
      data-status={verdict}
      onClick={onOpen}
      aria-label={`${requirement.label}, ${spoken(verdict)}${beneath ? `, ${beneath}` : ""}`}
    >
      <Ring verdict={verdict} />
      <span className="node-label">{shortLabel(requirement.label)}</span>
      <span className="node-beneath">{beneath}</span>
    </button>
  );
}

function Ring({ verdict }: { verdict: Verdict }) {
  const common = { viewBox: "0 0 24 24", className: "node-ring", "aria-hidden": true, focusable: false } as const;
  const stroke = "currentColor";

  switch (verdict) {
    case "satisfied":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill={stroke} />
          <path d="M7.5 12.4l3 3 6-6.4" fill="none" stroke="var(--canvas)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "partial":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill="none" stroke={stroke} strokeWidth="2" />
          <path d="M12 2a10 10 0 0 0 0 20Z" fill={stroke} />
        </svg>
      );
    case "unmet":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill="none" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case "unverifiable":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill="none" stroke={stroke} strokeWidth="2" strokeDasharray="3 3" />
        </svg>
      );
    default:
      // Manual: a human said so, and it must never look like a derived result.
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill={stroke} />
          <path d="M7.5 12h9" stroke="var(--canvas)" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
  }
}

/** The one fact under the label, chosen by what the student can act on. */
function underLabel(
  result: Result,
  verdict: Verdict,
  externalCredits: ExternalCredit[],
  offeredNextTerm: number | null,
  termLabel: string | null,
): string {
  if (verdict === "override") return "override";
  if (verdict === "attested") return "attested";
  if (verdict === "satisfied") {
    const first = result.satisfiedBy[0];
    if (!first) return "done";
    if (sameCourse(first, EXAM_PSEUDO_ID)) {
      return externalCredits.find((c) => c.qualifies && c.grantsAttributes.length > 0)?.label ?? "an exam";
    }
    // "PE 001, PE 001" is two sittings of one repeatable course. Say that,
    // rather than printing the same code twice as if they were two courses.
    const codes = result.satisfiedBy.map((c) => courseKey(c).replace(/ (PO|SC|HM|CM|PZ)$/, ""));
    const counts = new Map<string, number>();
    for (const c of codes) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts].map(([code, n]) => (n > 1 ? `${code} x${n}` : code)).join(", ");
  }
  if (verdict === "partial" && result.remaining) {
    const need = result.remaining.n;
    const have = result.satisfiedBy.length;
    return result.remaining.unit === "credits" ? `${need} more` : `${have} of ${have + need}`;
  }
  if (verdict === "unverifiable") return "needs a detail";
  // unmet: what is offered next term is the only actionable number here.
  if (offeredNextTerm !== null && termLabel) return `${offeredNextTerm} in ${termLabel}`;
  return result.candidates.length > 0 ? `${result.candidates.length} options` : "not yet";
}

function spoken(verdict: Verdict): string {
  return verdict === "unverifiable" ? "needs more information" : verdict;
}

/** "Breadth Area 3" reads as "Area 3" under its own family heading. */
function shortLabel(label: string): string {
  return label.replace(/^Breadth\s+/, "").replace(/\s+Intensive$/, "");
}
