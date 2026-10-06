import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CatalogArtefact, ExternalCreditRules, Manifest, Program } from "@sageplan/shared";
import { loadCatalog, loadManifest, loadPrograms, loadRules, type DataError } from "./loadData.ts";

export type DataState =
  | { status: "loading" }
  | { status: "error"; error: DataError }
  | {
      status: "ready";
      manifest: Manifest;
      catalog: CatalogArtefact;
      programs: Program[];
      rules: ExternalCreditRules;
      /** True when the generated artefacts are development fixtures, not the pipeline's. */
      fixture: boolean;
    };

const DataContext = createContext<DataState>({ status: "loading" });

export function useData(): DataState {
  return useContext(DataContext);
}

declare const __FIXTURE_DATA__: boolean;

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // The manifest first: it names every other file, so a failure here is the
      // one failure that stops everything.
      const manifest = await loadManifest();
      if (cancelled) return;
      if (!manifest.ok) return setState({ status: "error", error: manifest.error });

      // The rest in parallel. Nothing depends on anything else.
      const [catalog, programs, rules] = await Promise.all([
        loadCatalog(manifest.value.catalog.path),
        loadPrograms(manifest.value),
        loadRules(manifest.value.externalCreditRules.path),
      ]);
      if (cancelled) return;

      for (const result of [catalog, programs, rules]) {
        if (!result.ok) return setState({ status: "error", error: result.error });
      }
      if (!catalog.ok || !programs.ok || !rules.ok) return;

      setState({
        status: "ready",
        manifest: manifest.value,
        catalog: catalog.value,
        programs: programs.value,
        rules: rules.value,
        fixture: typeof __FIXTURE_DATA__ === "boolean" ? __FIXTURE_DATA__ : false,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}
