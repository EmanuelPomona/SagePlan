import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { StudentPlanSchema } from "@sageplan/shared";
import type { StudentPlan } from "@sageplan/shared";
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
  // hashchange. The earlier version of this test dispatched a hashchange AFTER
  // dismiss had already emptied the hash, so it hit the early return and passed
  // whether or not clearing used replaceState -- it did not test its own claim.
  // Listening for the event is what actually discriminates.
  test("clearing the fragment fires no hashchange, so the offer cannot loop", async () => {
    window.history.replaceState(null, "", await fragmentFor(1));
    const { result } = renderHook(() => useFragmentImport());
    await waitFor(() => expect(result.current.state.status).toBe("offered"));

    let fired = 0;
    const count = () => { fired += 1; };
    window.addEventListener("hashchange", count);
    act(() => result.current.dismiss());
    window.removeEventListener("hashchange", count);

    expect(fired).toBe(0);
    expect(result.current.state.status).toBe("none");
    expect(window.location.hash).toBe("");
  });

  // The security property the module leads with: someone opening a friend's
  // link must not silently lose their own record.
  test("an offered plan is never applied on its own", async () => {
    window.history.replaceState(null, "", await fragmentFor(2));
    const applied: StudentPlan[] = [];
    const { result } = renderHook(() => useFragmentImport());

    await waitFor(() => expect(result.current.state.status).toBe("offered"));
    act(() => result.current.dismiss());

    expect(applied).toHaveLength(0);
  });

  test("accept applies the offered plan, once, and then clears the offer", async () => {
    window.history.replaceState(null, "", await fragmentFor(2));
    const applied: StudentPlan[] = [];
    const { result } = renderHook(() => useFragmentImport());
    await waitFor(() => expect(result.current.state.status).toBe("offered"));

    act(() => result.current.accept((p) => applied.push(p)));

    expect(applied).toHaveLength(1);
    expect(applied[0]?.completed).toHaveLength(2);
    expect(result.current.state.status).toBe("none");

    // A second accept after the offer is gone must do nothing.
    act(() => result.current.accept((p) => applied.push(p)));
    expect(applied).toHaveLength(1);
  });

  test("navigating to an ordinary anchor clears a standing offer and keeps the anchor", async () => {
    window.history.replaceState(null, "", await fragmentFor(1));
    const { result } = renderHook(() => useFragmentImport());
    await waitFor(() => expect(result.current.state.status).toBe("offered"));

    await act(async () => {
      window.history.replaceState(null, "", "#main");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(result.current.state.status).toBe("none");
    act(() => result.current.dismiss());
    expect(window.location.hash).toBe("#main");
  });
});
