import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PLAN_SCHEMA_VERSION } from "@gradguide/shared";
import type { CompletedCourse } from "@gradguide/shared";
import { PLAN_STORAGE_KEY, usePlan } from "../plan/planStore.ts";

const course = (dept: string, n: number): CompletedCourse => ({
  course: { department: dept, courseNumber: n, suffix: "", affiliation: "PO" },
  term: { year: 2025, term: "FA" },
  grade: "A",
  gradeMode: "letter",
  provenance: "pomona",
});

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("usePlan: persistence", () => {
  test("starts from an empty plan when nothing is stored", () => {
    const { result } = renderHook(() => usePlan());

    expect(result.current.status).toBe("ok");
    expect(result.current.plan.completed).toEqual([]);
    expect(result.current.plan.schemaVersion).toBe(PLAN_SCHEMA_VERSION);
  });

  test("a course survives a reload", async () => {
    const first = renderHook(() => usePlan());
    act(() => first.result.current.addCompleted(course("CSCI", 51)));

    await waitFor(() => expect(localStorage.getItem(PLAN_STORAGE_KEY)).toContain("CSCI"));

    // A fresh mount is what a hard reload looks like to this hook.
    const second = renderHook(() => usePlan());
    expect(second.result.current.plan.completed).toHaveLength(1);
    expect(second.result.current.plan.completed[0]?.course.department).toBe("CSCI");
  });

  test("a corrupt stored plan reports corrupt and KEEPS the raw text for recovery", () => {
    localStorage.setItem(PLAN_STORAGE_KEY, "{ not a plan");
    const { result } = renderHook(() => usePlan());

    expect(result.current.status).toBe("corrupt");
    expect(result.current.rawStored()).toBe("{ not a plan");
    // The app still works: a corrupt store must not block the whole page.
    expect(result.current.plan.completed).toEqual([]);
  });

  test("a plan saved by a newer version is reported, not overwritten on load", () => {
    const newer = JSON.stringify({ schemaVersion: PLAN_SCHEMA_VERSION + 1, completed: [] });
    localStorage.setItem(PLAN_STORAGE_KEY, newer);
    const { result } = renderHook(() => usePlan());

    expect(result.current.status).toBe("corrupt");
    expect(result.current.rawStored()).toBe(newer);
  });

  test("a full disk reports quota rather than losing the edit silently", async () => {
    const { result } = renderHook(() => usePlan());
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("exceeded", "QuotaExceededError");
    });

    act(() => result.current.addCompleted(course("HIST", 101)));

    await waitFor(() => expect(result.current.status).toBe("quota"));
    // The edit is still present in memory; only persistence failed.
    expect(result.current.plan.completed).toHaveLength(1);
  });
});

describe("usePlan: editing", () => {
  test("setProfile replaces matriculation term and student type", () => {
    const { result } = renderHook(() => usePlan());
    act(() => result.current.setProfile({ matriculationTerm: { year: 2026, term: "FA" }, studentType: "transfer" }));

    expect(result.current.plan.studentType).toBe("transfer");
    expect(result.current.plan.matriculationTerm).toEqual({ year: 2026, term: "FA" });
  });

  test("courses can be added, patched and removed by index", () => {
    const { result } = renderHook(() => usePlan());
    act(() => result.current.addCompleted(course("CSCI", 51)));
    act(() => result.current.addCompleted(course("HIST", 101)));
    act(() => result.current.updateCompleted(0, { grade: "B+" }));

    expect(result.current.plan.completed[0]?.grade).toBe("B+");
    expect(result.current.plan.completed).toHaveLength(2);

    act(() => result.current.removeCompleted(0));
    expect(result.current.plan.completed).toHaveLength(1);
    expect(result.current.plan.completed[0]?.course.department).toBe("HIST");
  });

  test("removing an index that does not exist is ignored, not thrown", () => {
    const { result } = renderHook(() => usePlan());
    expect(() => act(() => result.current.removeCompleted(9))).not.toThrow();
  });

  test("attestations are set and cleared by requirement id", () => {
    const { result } = renderHook(() => usePlan());
    act(() => result.current.setAttestation("language", true));
    expect(result.current.plan.attestations["language"]).toBe(true);

    act(() => result.current.setAttestation("language", false));
    expect(result.current.plan.attestations["language"]).toBe(false);
  });

  test("overrides are added and removed", () => {
    const { result } = renderHook(() => usePlan());
    act(() =>
      result.current.addOverride({
        requirementId: "speaking-intensive",
        course: { department: "HIST", courseNumber: 101, suffix: "", affiliation: "PO" },
        reason: "Ran as a speaking-intensive section.",
        approvedBy: "Chair of History",
      }),
    );
    expect(result.current.plan.overrides).toHaveLength(1);

    act(() => result.current.removeOverride(0));
    expect(result.current.plan.overrides).toHaveLength(0);
  });

  test("replacePlan swaps the whole record, for import and share links", () => {
    const { result } = renderHook(() => usePlan());
    act(() => result.current.addCompleted(course("CSCI", 51)));
    act(() =>
      result.current.replacePlan({
        ...result.current.plan,
        completed: [course("MATH", 30)],
        studentType: "transfer",
      }),
    );

    expect(result.current.plan.completed).toHaveLength(1);
    expect(result.current.plan.completed[0]?.course.department).toBe("MATH");
    expect(result.current.plan.studentType).toBe("transfer");
  });

  test("recovering from corrupt: replacing the plan clears the corrupt status", async () => {
    localStorage.setItem(PLAN_STORAGE_KEY, "{ not a plan");
    const { result } = renderHook(() => usePlan());
    expect(result.current.status).toBe("corrupt");

    act(() => result.current.addCompleted(course("CSCI", 51)));
    await waitFor(() => expect(result.current.status).toBe("ok"));
  });
});
