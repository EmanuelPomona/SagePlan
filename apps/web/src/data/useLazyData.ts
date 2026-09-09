import { useEffect, useRef, useState } from "react";
import type { OfferingHistoryArtefact, SectionsArtefact, TermCode } from "@gradguide/shared";
import { loadHistory, loadSections, type DataError } from "./loadData.ts";

export type LazyState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; value: T }
  | { status: "error"; error: DataError };

/**
 * Section and offering data are fetched only when a student first asks "what
 * satisfies this?", and cached per term afterwards. Loading the whole term's
 * sections on page load would be a large download for a page most students open
 * to read a single row.
 */
export function useSections(term: TermCode | null): LazyState<SectionsArtefact> {
  const [state, setState] = useState<LazyState<SectionsArtefact>>({ status: "idle" });
  const cache = useRef(new Map<TermCode, LazyState<SectionsArtefact>>());

  useEffect(() => {
    if (term === null) return;
    const cached = cache.current.get(term);
    if (cached && cached.status !== "loading") {
      setState(cached);
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    void loadSections(term).then((result) => {
      if (cancelled) return;
      const next: LazyState<SectionsArtefact> = result.ok
        ? { status: "ready", value: result.value }
        : { status: "error", error: result.error };
      cache.current.set(term, next);
      setState(next);
    });

    return () => {
      cancelled = true;
    };
  }, [term]);

  return state;
}

export function useHistory(enabled: boolean): LazyState<OfferingHistoryArtefact> {
  const [state, setState] = useState<LazyState<OfferingHistoryArtefact>>({ status: "idle" });
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;

    let cancelled = false;
    setState({ status: "loading" });
    void loadHistory().then((result) => {
      if (cancelled) return;
      setState(result.ok ? { status: "ready", value: result.value } : { status: "error", error: result.error });
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
