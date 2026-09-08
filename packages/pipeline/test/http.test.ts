import { describe, expect, test, vi } from "vitest";
import { fetchJson } from "../src/http.ts";
import { PipelineError } from "../src/errors.ts";

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

describe("fetchJson", () => {
  test("returns parsed JSON on 200", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ hello: "world" }));
    await expect(fetchJson("https://x.test/a", { fetchImpl })).resolves.toEqual({ hello: "world" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("sends the headers it is given", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({}));
    await fetchJson("https://x.test/a", { fetchImpl, headers: { Origin: "https://catalog.pomona.edu" } });
    const init = fetchImpl.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Origin).toBe("https://catalog.pomona.edu");
  });

  test("throws a PipelineError carrying the status on 401 and does NOT retry it", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{"error":"Unauthenticated"}', { status: 401 }));
    const err = await fetchJson("https://x.test/a", { fetchImpl, baseDelayMs: 0 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PipelineError);
    expect((err as PipelineError).status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("does not retry 403 either", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("no", { status: 403 }));
    await fetchJson("https://x.test/a", { fetchImpl, baseDelayMs: 0 }).catch(() => {});
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("retries a 500 up to three attempts, then throws", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("boom", { status: 500 }));
    const err = await fetchJson("https://x.test/a", { fetchImpl, baseDelayMs: 0 }).catch((e: unknown) => e);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect((err as PipelineError).status).toBe(500);
  });

  test("recovers when a retry succeeds", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response("boom", { status: 503 }))
      .mockResolvedValueOnce(ok({ recovered: true }));
    await expect(fetchJson("https://x.test/a", { fetchImpl, baseDelayMs: 0 })).resolves.toEqual({ recovered: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test("retries a network error", async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(ok({ ok: 1 }));
    await expect(fetchJson("https://x.test/a", { fetchImpl, baseDelayMs: 0 })).resolves.toEqual({ ok: 1 });
  });

  test("throws a PipelineError when the body is not JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("<html>", { status: 200 }));
    await expect(fetchJson("https://x.test/a", { fetchImpl, baseDelayMs: 0 })).rejects.toBeInstanceOf(PipelineError);
  });
});
