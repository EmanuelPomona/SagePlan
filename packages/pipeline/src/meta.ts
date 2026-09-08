import { ARTEFACT_SCHEMA_VERSION, type ArtefactMeta, type CatalogYear } from "@gradguide/shared";

export const PIPELINE_VERSION = "0.1.0";

/**
 * Provenance stamp. Validator 6 fails the build if any artefact lacks one, and
 * the UI renders `fetchedAt` as "catalog data as of ...".
 */
export function makeMeta(input: {
  generator: string;
  sourceUrl: string;
  fetchedAt: string;
  catalogYear: CatalogYear | string;
}): ArtefactMeta {
  return {
    schemaVersion: ARTEFACT_SCHEMA_VERSION,
    generator: `@gradguide/pipeline@${PIPELINE_VERSION} ${input.generator}`,
    generatedAt: new Date().toISOString(),
    fetchedAt: input.fetchedAt,
    sourceUrl: input.sourceUrl,
    catalogYear: input.catalogYear as CatalogYear,
  };
}
