import type { GeAttribute } from "@gradguide/shared";

/**
 * Divergence categories for AC-P09 (ADR-016).
 *
 * The raw ~260 Coursedog-vs-Registrar disagreements are not a defect — the two
 * sources have always disagreed. An UNCATEGORISED pile of 260 is, because nobody
 * can act on it, and this report is what the Registrar courtesy review is built
 * on. So every divergence gets a named category, and every category states which
 * source is more likely right and why.
 *
 * On the reasoning: the Registrar export is a DATED SNAPSHOT (2026-09-08) of the
 * office that assigns GE attributes; Coursedog is the LIVE catalog that displays
 * them. Neither is authoritative, and the pipeline never resolves toward one.
 * These verdicts are hypotheses for a human to confirm, which is precisely what
 * the report exists to enable.
 */
export interface DivergenceCategory {
  id: string;
  label: string;
  /** "Registrar" | "Coursedog" | "neither" — a hypothesis, never an action. */
  likelierCorrect: string;
  why: string;
}

const AREA = (a: GeAttribute) => a.startsWith("AREA_");

export const DIVERGENCE_CATEGORIES: Readonly<Record<string, DivergenceCategory>> = {
  "overlay-only-in-registrar": {
    id: "overlay-only-in-registrar",
    label: "Registrar carries an overlay (WI / SI / AD / Language / PE) the catalog does not",
    likelierCorrect: "Registrar",
    why: "Overlays are certified per offering by the Registrar, and the catalog record is edited by departments. A missing overlay in Coursedog is the commoner direction of error, and the cost of being wrong is high: the student is told they still owe a Writing Intensive they have already done.",
  },
  "overlay-only-in-coursedog": {
    id: "overlay-only-in-coursedog",
    label: "The catalog carries an overlay the Registrar export does not",
    likelierCorrect: "Coursedog",
    why: "The export is a snapshot taken on 2026-09-08 and the catalog is live, so a newly certified overlay appears in Coursedog first. Confirm the certification date with the Registrar before relying on it.",
  },
  "area-only-in-registrar": {
    id: "area-only-in-registrar",
    label: "Registrar assigns a breadth Area the catalog does not",
    likelierCorrect: "Registrar",
    why: "Area designation is the Registrar's to make. A course tagged in the export but untagged in the catalog usually means the catalog record was not updated, and the student loses credit they have earned.",
  },
  "area-only-in-coursedog": {
    id: "area-only-in-coursedog",
    label: "The catalog assigns a breadth Area the Registrar export does not",
    likelierCorrect: "neither — check before trusting",
    why: "This is the direction that would wrongly tell a student a requirement is satisfied, so it should not be trusted without confirmation. It is equally consistent with a new designation post-dating the snapshot and with a catalog error.",
  },
  "area-mismatch": {
    id: "area-mismatch",
    label: "Both sources assign a breadth Area, but different ones",
    likelierCorrect: "Registrar",
    why: "A course cannot sit in two Areas (THEA 085 PO is the single documented exception), so exactly one source is wrong. The Registrar owns the designation, so its value is the better default — but every row here deserves an individual answer.",
  },
  mixed: {
    id: "mixed",
    label: "Areas and overlays both differ",
    likelierCorrect: "neither — needs a row-by-row answer",
    why: "More than one thing disagrees at once, so no single rule of thumb applies. These are the rows to put in front of the Registrar first.",
  },
  "missing-from-registrar-export": {
    id: "missing-from-registrar-export",
    label: "Catalog course carrying GE attributes that the Registrar export does not list at all",
    likelierCorrect: "Coursedog",
    why: "The export is a snapshot; a course created after it was taken cannot appear in it. Most of these are expected. Worth checking only where the course is clearly not new.",
  },
  "missing-from-catalog": {
    id: "missing-from-catalog",
    label: "Registrar tags the course, but it is absent from the catalog entirely",
    likelierCorrect: "Registrar",
    why: "These matter most to a student: the course cannot be found in the app at all, so credit it should grant is unreachable. Usually the course is inactive in Coursedog while the export still carries it.",
  },
  none: {
    id: "none",
    label: "No divergence",
    likelierCorrect: "n/a",
    why: "The two sources agree; this row should never appear in the report.",
  },
};

/**
 * @param inCatalog false when the Registrar tags a course the catalog lacks entirely.
 * @param inRegistrar false when the export does not list the course at all.
 */
export function categoriseDivergence(
  coursedog: readonly GeAttribute[],
  registrar: readonly GeAttribute[],
  inRegistrar = true,
  missingFromCatalog = false,
): DivergenceCategory {
  if (missingFromCatalog) return DIVERGENCE_CATEGORIES["missing-from-catalog"]!;
  if (!inRegistrar) return DIVERGENCE_CATEGORIES["missing-from-registrar-export"]!;

  const cd = new Set(coursedog);
  const rg = new Set(registrar);
  const cdOnly = [...cd].filter((a) => !rg.has(a));
  const rgOnly = [...rg].filter((a) => !cd.has(a));
  if (cdOnly.length === 0 && rgOnly.length === 0) return DIVERGENCE_CATEGORIES["none"]!;

  const cdAreas = cdOnly.filter(AREA);
  const rgAreas = rgOnly.filter(AREA);
  const cdOverlays = cdOnly.filter((a) => !AREA(a));
  const rgOverlays = rgOnly.filter((a) => !AREA(a));

  const areaDiff = cdAreas.length > 0 || rgAreas.length > 0;
  const overlayDiff = cdOverlays.length > 0 || rgOverlays.length > 0;

  if (areaDiff && overlayDiff) return DIVERGENCE_CATEGORIES["mixed"]!;

  if (areaDiff) {
    if (cdAreas.length > 0 && rgAreas.length > 0) return DIVERGENCE_CATEGORIES["area-mismatch"]!;
    return cdAreas.length > 0
      ? DIVERGENCE_CATEGORIES["area-only-in-coursedog"]!
      : DIVERGENCE_CATEGORIES["area-only-in-registrar"]!;
  }

  if (cdOverlays.length > 0 && rgOverlays.length > 0) return DIVERGENCE_CATEGORIES["mixed"]!;
  return cdOverlays.length > 0
    ? DIVERGENCE_CATEGORIES["overlay-only-in-coursedog"]!
    : DIVERGENCE_CATEGORIES["overlay-only-in-registrar"]!;
}
