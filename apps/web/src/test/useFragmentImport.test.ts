import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { StudentPlanSchema } from "@gradguide/shared";
import type { StudentPlan } from "@gradguide/shared";
import { useFragmentImport } from "../share/useFragmentImport.ts";
import { encodePlan, FRAGMENT_PREFIX } from "../share/shareLink.ts";

const demo = (name: string): StudentPlan =>
  StudentPlanSchema.parse(
    JSON.parse(readFileSync(resolve(__dirname, "..", "..", "public", "demo", `${name}.json`), "utf8")),
  );

async function fragmentFor(courses: number): Promise<string> {
  const base = demo("F-01-on-track");
  const plan: StudentPlan = { ...base, completed: base.completed.slice(0, courses) };
  return FRAGMENT_PREFIX + (await encodePlan(plan));
}

describe("a share link that arrives without a page load", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  test("a fragment present at mount is offered", async () => {
    window.history.replaceState(null, "", await fragmentFor(2));
    const { result } = renderHook(() => useFragmentImport());
    await waitFor(() => expect(result.current.state.status).toBe("offered"));
  });

  // Pasting a share link into the address bar while GradGuide is already open
  // is a same-document navigation: the document never reloads, so a mount-only
  // read sees nothing and the link appears to do nothing at all.
  test("a fragment that arrives after mount is offered too", async () => {
    const { result } = renderHook(() => useFragmentImport());
    expect(result.current.state.status).toBe("none");

    const fragment = await fragmentFor(3);
    await act(async () => {
      window.history.replaceState(null, "", fragment);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    await waitFor(() => expect(result.current.state.status).toBe("offered"));
    if (result.current.state.status !== "offered") throw new Error("unreachable");
    expect(result.current.state.plan.completed).toHaveLength(3);
  });

  // Accept and dismiss clear the fragment with replaceState, which fires no
  // hashchange. If that ever changes, the offer would loop straight back.
  test("dismissing does not re-offer the same link", async () => {
    window.history.replaceState(null, "", await fragmentFor(1));
    const { result } = renderHook(() => useFragmentImport());
    await waitFor(() => expect(result.current.state.status).toBe("offered"));

    act(() => result.current.dismiss());
    expect(result.current.state.status).toBe("none");

    await act(async () => { window.dispatchEvent(new HashChangeEvent("hashchange")); });
    expect(result.current.state.status).toBe("none");
    expect(window.location.hash).toBe("");
  });
});
