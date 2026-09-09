import { useEffect, useState } from "react";
import type { StudentPlan } from "@gradguide/shared";
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
 */
export function useFragmentImport(): {
  state: FragmentState;
  accept: (apply: (plan: StudentPlan) => void) => void;
  dismiss: () => void;
} {
  const [state, setState] = useState<FragmentState>({ status: "none" });

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith(FRAGMENT_PREFIX)) return;

    let cancelled = false;
    void decodePlan(hash.slice(FRAGMENT_PREFIX.length)).then((result) => {
      if (cancelled) return;
      setState(result.ok ? { status: "offered", plan: result.plan } : { status: "failed", detail: result.detail });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const clearFragment = () => {
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
