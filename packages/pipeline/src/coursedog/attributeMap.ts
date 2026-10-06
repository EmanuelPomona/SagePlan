import type { GeAttribute } from "@sageplan/shared";

/**
 * Coursedog GE attribute strings -> GeAttribute.
 *
 * Discovered from the live catalog on 2026-09-08 (2,811 records); the brief did
 * not document them. Two facts drive the shape of this file:
 *
 * 1. An `attributes[]` ENTRY is a semicolon-delimited COMPOSITE that mixes a GE
 *    requirement tag with unrelated subject groupings, e.g.
 *      "PO Area 2 Requirement ;All Government/Politics ;Politics"
 *    so the map is keyed on the split-and-trimmed TOKEN, not the whole entry.
 * 2. Pomona's GE tags all live in the "PO " namespace. 106 distinct tokens exist
 *    across the catalog; exactly 12 of them are GE attributes.
 *
 * The count after each entry is how many records carried that token on
 * 2026-09-08, so a future drift shows up as a count change, not a silent zero.
 */
export const COURSEDOG_ATTRIBUTE_MAP: Readonly<Record<string, GeAttribute>> = {
  "PO Area 1 Requirement": "AREA_1", //   454
  "PO Area 2 Requirement": "AREA_2", //   364
  "PO Area 3 Requirement": "AREA_3", //   301
  "PO Area 4 Requirement": "AREA_4", //   179
  "PO Area 5 Requirement": "AREA_5", //   100
  "PO Area 6 Requirement": "AREA_6", //   223
  "PO Writing Intensive Req": "WRITING_INTENSIVE", //   173
  "PO Speaking Intensive": "SPEAKING_INTENSIVE", //   198
  "PO Analyzing Difference": "ANALYZING_DIFFERENCE", //   125
  "PO Language Requirement": "LANGUAGE", //   130
  "PO Phys Ed Requirement": "PHYSICAL_EDUCATION", //   181
  "PO Community Partnership": "COMMUNITY_PARTNERSHIP", //    27
};

/**
 * Tokens that trip GE_GUARD_RE but are deliberately NOT general-education tags.
 * Listed explicitly, with the reason, so that a genuinely new GE token (say
 * "PO Area 9 Requirement") still fails the build instead of being waved through.
 */
export const KNOWN_NON_GE_TOKENS: Readonly<Record<string, string>> = {
  // Subject grouping for every language course, including 100-level courses that
  // carry no GE credit. The GE tag is "PO Language Requirement". (209 records)
  "All Languages": "subject grouping, not the GE language requirement",
  // Department grouping. The GE tag is "PO Phys Ed Requirement", which contains
  // neither "Physical" nor "Area". (155 records)
  "Physical Education": "department grouping, not the GE physical-education requirement",
  // Pomona's Dual Degree Program marker. Not a GE attribute — dropped for the
  // same reason Hyperschedule's "1DDP" is. (76 records)
  "PO DDP Courses": "dual degree programme marker, not a GE attribute",
};

/**
 * A token is GE-shaped if it lives in Pomona's "PO " requirement namespace, or
 * carries one of the GE words. If it is neither mapped nor explicitly
 * known-non-GE, the catalog command fails rather than silently drop a
 * requirement tag (TASK-010).
 *
 * The `^PO ` alternative is load-bearing, not belt-and-braces: the keyword list
 * alone does NOT match "PO Phys Ed Requirement" ("Phys" is not "Physical") or
 * "PO Community Partnership", so a rename of either would have dropped 181 and
 * 27 courses' GE tags with a green build. Every key in the map is asserted
 * against this pattern in attributeMap.test.ts.
 */
export const GE_GUARD_RE = /^PO |Area|Intensive|Analyzing|Language|Physical/i;

export interface MappedAttributes {
  /** GE attributes, de-duplicated, in first-seen order. */
  attrs: GeAttribute[];
  /** GE-shaped tokens we do not recognise. Non-empty means: fail the build. */
  unmapped: string[];
  /** Recognised non-GE tokens. Counted for the log, never an error. */
  dropped: string[];
}

/** Split one raw Coursedog `attributes[]` entry into its tokens. */
export function splitAttributeEntry(entry: string): string[] {
  return String(entry)
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function mapAttributes(entries: readonly string[]): MappedAttributes {
  const attrs: GeAttribute[] = [];
  const unmapped: string[] = [];
  const dropped: string[] = [];
  const seenAttr = new Set<GeAttribute>();
  const seenUnmapped = new Set<string>();
  const seenDropped = new Set<string>();

  for (const entry of entries ?? []) {
    for (const token of splitAttributeEntry(entry)) {
      const mapped = COURSEDOG_ATTRIBUTE_MAP[token];
      if (mapped !== undefined) {
        if (!seenAttr.has(mapped)) {
          seenAttr.add(mapped);
          attrs.push(mapped);
        }
        continue;
      }
      if (token in KNOWN_NON_GE_TOKENS) {
        if (!seenDropped.has(token)) {
          seenDropped.add(token);
          dropped.push(token);
        }
        continue;
      }
      if (GE_GUARD_RE.test(token)) {
        if (!seenUnmapped.has(token)) {
          seenUnmapped.add(token);
          unmapped.push(token);
        }
        continue;
      }
      if (!seenDropped.has(token)) {
        seenDropped.add(token);
        dropped.push(token);
      }
    }
  }
  return { attrs, unmapped, dropped };
}
