import { HYPERSCHEDULE_GE_CODES, type GeAttribute } from "@sageplan/shared";

/**
 * Pomona codes that are real but are NOT general-education attributes.
 * Listed explicitly so they do not pollute `unknownPomona`, which exists to
 * surface codes nobody has classified yet.
 */
const KNOWN_NON_ATTRIBUTE_PO_CODES = new Set([
  // Dual Degree Program marker. Brief section 7B says to drop it, and the
  // Hyperschedule /v4/course-areas description confirms what it is.
  "1DDP",
  // NOTE — 1P1..1P10 were allowlisted here with the comment "these subdivide
  // 1PE by activity". That was FACTUALLY WRONG (reviewer L-7): of the 123
  // FA2026 sections carrying a 1P<digit> code, 122 carry NO 1PE, and they are
  // not PE courses at all — ARHI 150 SC carries 1A1 and 1P5, ART 005 PO carries
  // 1A6 and 1P6. Allowlisting them on a false premise made validator 4 report
  // "0 unrecognised Pomona codes", which was an artefact of this list rather
  // than a fact about the data. They are now reported with their counts until
  // somebody establishes what they mean.
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
