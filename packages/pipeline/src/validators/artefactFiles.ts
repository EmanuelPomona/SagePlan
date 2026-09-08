import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  CatalogArtefactSchema, OfferingHistoryArtefactSchema, SectionsArtefactSchema, ManifestSchema,
} from "@gradguide/shared";
import type { z } from "zod";

export interface ArtefactFile { path: string; rel: string; schema: z.ZodType; hasMeta: boolean }

/** Every GENERATED file in /data, with the schema it must satisfy. */
export function generatedArtefacts(dataDir: string): ArtefactFile[] {
  const files: ArtefactFile[] = [];
  const add = (name: string, schema: z.ZodType, hasMeta = true) => {
    const path = join(dataDir, name);
    if (existsSync(path)) files.push({ path, rel: name, schema, hasMeta });
  };
  add("catalog.json", CatalogArtefactSchema);
  add("offering-history.json", OfferingHistoryArtefactSchema);
  add("manifest.json", ManifestSchema, false); // the manifest carries its own stamp, not a meta block
  if (existsSync(dataDir)) {
    for (const f of readdirSync(dataDir)) {
      if (/^sections-.+\.json$/.test(f)) add(f, SectionsArtefactSchema);
    }
  }
  return files;
}
