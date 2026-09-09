import { useCallback, useEffect, useRef, useState } from "react";
import { emptyPlan } from "@gradguide/shared";
import type {
  CompletedCourse,
  ExternalCredit,
  Override,
  StudentPlan,
  StudentType,
  TermId,
} from "@gradguide/shared";
import { migratePlan } from "./migratePlan.ts";

/** Versioned key: a future format change gets its own key and cannot corrupt this one. */
export const PLAN_STORAGE_KEY = "gradguide:plan:v1";

const SAVE_DEBOUNCE_MS = 250;

export type PlanStatus = "ok" | "corrupt" | "quota";

export type PlanStore = {
  plan: StudentPlan;
  status: PlanStatus;
  setProfile(profile: { matriculationTerm: TermId; studentType: StudentType }): void;
  addCompleted(course: CompletedCourse): void;
  updateCompleted(index: number, patch: Partial<CompletedCourse>): void;
  removeCompleted(index: number): void;
  addExternalCredit(credit: ExternalCredit): void;
  removeExternalCredit(index: number): void;
  setAttestation(id: string, value: boolean): void;
  addOverride(override: Override): void;
  removeOverride(index: number): void;
  replacePlan(plan: StudentPlan): void;
  /** The text that was in storage at load time, when it could not be read. */
  rawStored(): string | null;
};

/** A sensible starting point before the student tells us anything. */
function defaultPlan(): StudentPlan {
  return emptyPlan("2026-2027", { year: new Date().getFullYear(), term: "FA" }, "firstYear");
}

type Initial = { plan: StudentPlan; status: PlanStatus; raw: string | null };

/** Read storage exactly once, at mount. */
function readInitial(): Initial {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PLAN_STORAGE_KEY);
  } catch {
    // Private mode or storage disabled: behave as though nothing was stored.
    return { plan: defaultPlan(), status: "ok", raw: null };
  }
  if (raw === null) return { plan: defaultPlan(), status: "ok", raw: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { plan: defaultPlan(), status: "corrupt", raw };
  }

  const migrated = migratePlan(parsed);
  if (!migrated.ok) return { plan: defaultPlan(), status: "corrupt", raw };
  return { plan: migrated.plan, status: "ok", raw: null };
}

/**
 * The student's record: the only state this app persists, and the only thing in
 * it that is theirs. It never leaves the browser.
 *
 * A record we cannot read is reported, not discarded: `status: "corrupt"` keeps
 * the unreadable text available so the student can copy it out, and the app
 * still works around it.
 */
export function usePlan(): PlanStore {
  // Lazy initialiser: storage is read once, not on every render.
  const [initial] = useState<Initial>(readInitial);
  const [plan, setPlan] = useState<StudentPlan>(initial.plan);
  const [status, setStatus] = useState<PlanStatus>(initial.status);

  const rawAtLoad = useRef<string | null>(initial.raw);
  // Nothing is written until the student actually edits, so an unreadable
  // record is never overwritten just by visiting the page.
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) return;
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
        setStatus((s) => (s === "ok" ? s : "ok"));
      } catch {
        setStatus("quota");
      }
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [plan]);

  // Functional updates only, so every callback below is stable for the life of
  // the component and never re-creates the sections that receive it.
  const edit = useCallback((change: (previous: StudentPlan) => StudentPlan) => {
    dirty.current = true;
    setPlan(change);
  }, []);

  const setProfile = useCallback<PlanStore["setProfile"]>(
    (profile) => edit((p) => ({ ...p, ...profile })),
    [edit],
  );

  const addCompleted = useCallback<PlanStore["addCompleted"]>(
    (course) => edit((p) => ({ ...p, completed: [...p.completed, course] })),
    [edit],
  );

  const updateCompleted = useCallback<PlanStore["updateCompleted"]>(
    (index, patch) =>
      edit((p) =>
        index < 0 || index >= p.completed.length
          ? p
          : { ...p, completed: p.completed.map((c, i) => (i === index ? { ...c, ...patch } : c)) },
      ),
    [edit],
  );

  const removeCompleted = useCallback<PlanStore["removeCompleted"]>(
    (index) => edit((p) => (index < 0 || index >= p.completed.length ? p : { ...p, completed: p.completed.filter((_, i) => i !== index) })),
    [edit],
  );

  const addExternalCredit = useCallback<PlanStore["addExternalCredit"]>(
    (credit) => edit((p) => ({ ...p, externalCredits: [...p.externalCredits, credit] })),
    [edit],
  );

  const removeExternalCredit = useCallback<PlanStore["removeExternalCredit"]>(
    (index) => edit((p) => (index < 0 || index >= p.externalCredits.length ? p : { ...p, externalCredits: p.externalCredits.filter((_, i) => i !== index) })),
    [edit],
  );

  const setAttestation = useCallback<PlanStore["setAttestation"]>(
    (id, value) => edit((p) => ({ ...p, attestations: { ...p.attestations, [id]: value } })),
    [edit],
  );

  const addOverride = useCallback<PlanStore["addOverride"]>(
    (override) => edit((p) => ({ ...p, overrides: [...p.overrides, override] })),
    [edit],
  );

  const removeOverride = useCallback<PlanStore["removeOverride"]>(
    (index) => edit((p) => (index < 0 || index >= p.overrides.length ? p : { ...p, overrides: p.overrides.filter((_, i) => i !== index) })),
    [edit],
  );

  const replacePlan = useCallback<PlanStore["replacePlan"]>((next) => edit(() => next), [edit]);

  const rawStored = useCallback(() => rawAtLoad.current, []);

  return {
    plan,
    status,
    setProfile,
    addCompleted,
    updateCompleted,
    removeCompleted,
    addExternalCredit,
    removeExternalCredit,
    setAttestation,
    addOverride,
    removeOverride,
    replacePlan,
    rawStored,
  };
}
