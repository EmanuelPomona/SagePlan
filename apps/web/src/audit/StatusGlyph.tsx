import type { RequirementStatus } from "@gradguide/shared";

/**
 * The four verdicts, drawn rather than typed.
 *
 * The obvious implementation is the Unicode marks the brief sketches
 * (U+25CF U+25D0 U+25CB U+25CC), but two of them sit in Geometric Shapes and are
 * not reliably covered by IBM Plex. One missing glyph falls back to another font
 * and breaks the alignment of the exact row the student is reading. Four
 * primitives cost nothing and render identically everywhere.
 *
 * The mark is decorative: every row also carries the status WORD as real text,
 * so nothing here is conveyed by colour or shape alone.
 */
export type Verdict = RequirementStatus | "waived" | "override" | "attested";

/** A human said so, and it must never look like something the engine derived. */
const MANUAL: Verdict[] = ["waived", "override", "attested"];

export function StatusGlyph({ status }: { status: Verdict }) {
  const common = { width: 12, height: 12, viewBox: "0 0 12 12", "aria-hidden": true, focusable: false } as const;
  const color = MANUAL.includes(status) ? "var(--manual)" : `var(--${status})`;

  if (MANUAL.includes(status)) {
    return (
      <svg {...common} className="glyph">
        <circle cx="6" cy="6" r="5" fill="none" stroke={color} strokeWidth="1.5" />
        <path d="M3.5 6h5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  switch (status) {
    case "satisfied":
      return (
        <svg {...common} className="glyph">
          <circle cx="6" cy="6" r="5" fill={color} />
        </svg>
      );
    case "partial":
      return (
        <svg {...common} className="glyph">
          <circle cx="6" cy="6" r="5" fill="none" stroke={color} strokeWidth="1.5" />
          <path d="M6 1a5 5 0 0 0 0 10Z" fill={color} />
        </svg>
      );
    case "unmet":
      return (
        <svg {...common} className="glyph">
          <circle cx="6" cy="6" r="5" fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
      );
    case "unverifiable":
      return (
        <svg {...common} className="glyph">
          <circle cx="6" cy="6" r="5" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * What the row actually says. A requirement that does not apply to this student
 * reads "not required", never "satisfied": two rows both labelled Physical
 * Education, one of them green and ticked, is how a student concludes they have
 * finished something they have not started.
 */
export function verdictOf(result: {
  status: RequirementStatus;
  waived?: boolean;
  viaOverride?: boolean;
  viaAttestation?: boolean;
}): Verdict {
  if (result.waived) return "waived";
  if (result.viaOverride) return "override";
  if (result.viaAttestation) return "attested";
  return result.status;
}

/** The word that accompanies every mark. Never colour alone. */
export const STATUS_WORD: Record<Verdict, string> = {
  satisfied: "satisfied",
  partial: "partial",
  unmet: "unmet",
  unverifiable: "unverifiable",
  waived: "not required",
  override: "override",
  attested: "attested",
};
