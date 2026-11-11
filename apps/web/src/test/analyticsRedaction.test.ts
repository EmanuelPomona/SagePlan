import { describe, expect, test } from "vitest";
import { redactPageView } from "../share/analyticsRedaction.ts";

describe("redactPageView", () => {
  test("a share link's #plan= payload never reaches analytics", () => {
    const event = { type: "pageview" as const, url: "https://sageplan.vercel.app/#plan=zZdNb4JAEIb_y16LidiKCTekVE0UiZgmxnjYwmhJ" };
    expect(redactPageView(event)).toEqual({ type: "pageview", url: "https://sageplan.vercel.app/" });
  });

  test("the query string is dropped too, so only the path is counted", () => {
    const event = { type: "pageview" as const, url: "https://sageplan.vercel.app/some/path?x=1#plan=abc" };
    expect(redactPageView(event)?.url).toBe("https://sageplan.vercel.app/some/path");
  });

  test("a plain URL passes through unchanged", () => {
    const event = { type: "event" as const, url: "https://sageplan.vercel.app/" };
    expect(redactPageView(event)).toEqual(event);
  });
});
