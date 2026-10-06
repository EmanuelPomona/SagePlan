import { useEffect, useState } from "react";
import type { OfferingHistoryArtefact, SectionsArtefact, TermCode } from "@sageplan/shared";
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
/**
 * Shared across rows, not per component: every open requirement asks about the
 * same term, and a cache living in a ref would fetch the term's sections again
 * for each row the student expands.
 */
const sectionsCache = new Map<TermCode, ReturnType<typeof loadSections>>();

export function useSections(term: TermCode | null): LazyState<SectionsArtefact> {
  const [state, setState] = useState<LazyState<SectionsArtefact>>({ status: "idle" });

  useEffect(() => {
    if (term === null) return;

    let cancelled = false;
    setState({ status: "loading" });
    let pending = sectionsCache.get(term);
    if (!pending) {
      pending = loadSections(term);
      sectionsCache.set(term, pending);
    }
    void pending.then((result) => {
      if (cancelled) return;
      setState(result.ok ? { status: "ready", value: result.value } : { status: "error", error: result.error });
    });

    return () => {
      cancelled = true;
    };
  }, [term]);

  return state;
}

/**
 * Offering history is one file for the whole app, so the request is shared
 * rather than repeated per row.
 *
 * The promise is cached at module level rather than guarded by a ref. A ref
 * guard looks equivalent and is not: under StrictMode React runs the effect,
 * cleans it up, and runs it again, so the first pass sets the guard and starts
 * the fetch, the cleanup cancels it, and the second pass returns early having
 * already been "started". The result never arrives and every term ribbon comes
 * back empty, which is exactly what happened.
 */
let historyPromise: ReturnType<typeof loadHistory> | null = null;

export function useHistory(enabled: boolean): LazyState<OfferingHistoryArtefact> {
  const [state, setState] = useState<LazyState<OfferingHistoryArtefact>>({ status: "idle" });

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setState({ status: "loading" });
    historyPromise ??= loadHistory();
    void historyPromise.then((result) => {
      if (cancelled) return;
      setState(result.ok ? { status: "ready", value: result.value } : { status: "error", error: result.error });
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
