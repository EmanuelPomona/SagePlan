import { useEffect, useState } from "react";
import type { StudentPlan } from "@sageplan/shared";
import { FRAGMENT_PREFIX, decodePlan } from "./shareLink.ts";

export type FragmentState =
  | { status: "none" }
  | { status: "offered"; plan: StudentPlan }
  | { status: "failed"; detail: string };

/**
 * A shared link arrives as a fragment. It is never applied automatically:
 * someone opening a friend's link should not silently lose their own record.
 *
 * The fragment is cleared either way, so a reload does not re-offer an import
 * the student already declined, and the link does not sit in the address bar
 * with someone else's coursework in it.
 *
 * The fragment is read on mount AND on hashchange. Pasting a share link into
 * the address bar of a tab that already has GradGuide open is a same-document
 * navigation: nothing reloads and nothing remounts, so a mount-only read makes
 * the link look broken. Clearing the fragment uses replaceState, which fires no
 * hashchange, so accepting or dismissing cannot re-trigger the offer.
 */
export function useFragmentImport(): {
  state: FragmentState;
  accept: (apply: (plan: StudentPlan) => void) => void;
  dismiss: () => void;
} {
  const [state, setState] = useState<FragmentState>({ status: "none" });

  useEffect(() => {
    let cancelled = false;
    // Two fragments in quick succession must not race: only the newest read may
    // set state, however the decodes interleave.
    let generation = 0;

    const read = () => {
      const mine = ++generation;
      const hash = window.location.hash;
      if (!hash.startsWith(FRAGMENT_PREFIX)) {
        // Navigating to an ordinary anchor is not a share link. Any standing
        // offer or failure belongs to a fragment that is no longer there.
        setState({ status: "none" });
        return;
      }

      void decodePlan(hash.slice(FRAGMENT_PREFIX.length)).then((result) => {
        if (cancelled || mine !== generation) return;
        setState(result.ok ? { status: "offered", plan: result.plan } : { status: "failed", detail: result.detail });
      });
    };

    read();
    window.addEventListener("hashchange", read);
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", read);
    };
  }, []);

  const clearFragment = () => {
    // Only ever clear OUR fragment. Stripping the hash unconditionally would
    // also throw away an ordinary in-page anchor the student had navigated to.
    if (!window.location.hash.startsWith(FRAGMENT_PREFIX)) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  return {
    state,
    accept: (apply) => {
      if (state.status !== "offered") return;
      apply(state.plan);
      clearFragment();
      setState({ status: "none" });
    },
    dismiss: () => {
      clearFragment();
      setState({ status: "none" });
    },
  };
}
