import { HYPERSCHEDULE_GE_CODES, type GeAttribute } from "@gradguide/shared";

/**
 * Pomona codes that are real but are NOT general-education attributes.
 * Listed explicitly so they do not pollute `unknownPomona`, which exists to
 * surface codes nobody has classified yet.
 */
const KNOWN_NON_ATTRIBUTE_PO_CODES = new Set([
  "1DDP", // Dual Degree Program marker (brief section 7B says to drop it)
  // Physical-education activity codes seen live on 2026-09-08 (1P1..1P10).
  // The GE attribute is 1PE; these subdivide it by activity.
  "1P1", "1P2", "1P3", "1P4", "1P5", "1P6", "1P7", "1P8", "1P9", "1P10",
]);

export interface MappedGeCodes {
  attrs: GeAttribute[];
  /** Codes belonging to another college's requirements. Kept in Section.geCodes. */
  nonPomona: string[];
  /** Pomona-prefixed codes we do not recognise. Reported, never discarded. */
  unknownPomona: string[];
}

export function mapGeCodes(codes: readonly string[]): MappedGeCodes {
  const attrs: GeAttribute[] = [];
  const nonPomona: string[] = [];
  const unknownPomona: string[] = [];
  const seen = new Set<string>();

  for (const raw of codes ?? []) {
    const code = String(raw).trim().toUpperCase();
    if (code.length === 0 || seen.has(code)) continue;
    seen.add(code);

    const mapped = HYPERSCHEDULE_GE_CODES[code];
    if (mapped !== undefined) {
      if (!attrs.includes(mapped)) attrs.push(mapped);
      continue;
    }
    if (KNOWN_NON_ATTRIBUTE_PO_CODES.has(code)) continue;
    // Pomona is campus 1; anything else belongs to another college.
    if (/^1/.test(code)) unknownPomona.push(code);
    else nonPomona.push(code);
  }
  return { attrs, nonPomona, unknownPomona };
}
