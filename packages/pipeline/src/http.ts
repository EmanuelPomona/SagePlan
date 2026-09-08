import { PipelineError, isRetriableStatus } from "./errors.ts";

export type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

export interface FetchJsonOptions {
  headers?: Record<string, string>;
  /** Injected in tests. The pipeline never calls a real API from a test. */
  fetchImpl?: FetchImpl;
  retries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchJson(url: string, options: FetchJsonOptions = {}): Promise<unknown> {
  const { headers = {}, fetchImpl = fetch as FetchImpl, retries = 3, baseDelayMs = 500, timeoutMs = 60_000 } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { headers, signal: controller.signal });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const err = new PipelineError(
          `GET ${url} -> HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
          "HTTP_ERROR",
          res.status,
        );
        // A 401/403 means the request itself is wrong (Coursedog needs the Origin
        // header). Retrying just repeats it, so surface it immediately.
        if (!isRetriableStatus(res.status)) throw err;
        lastError = err;
      } else {
        const text = await res.text();
        try {
          return JSON.parse(text) as unknown;
        } catch {
          throw new PipelineError(`GET ${url} -> body is not JSON (${text.slice(0, 120)})`, "HTTP_BAD_JSON", res.status);
        }
      }
    } catch (e) {
      if (e instanceof PipelineError && e.code !== "HTTP_ERROR") throw e;
      if (e instanceof PipelineError && e.status !== undefined && !isRetriableStatus(e.status)) throw e;
      lastError = e;
    } finally {
      clearTimeout(timer);
    }

    if (attempt < retries) await sleep(baseDelayMs * 2 ** (attempt - 1));
  }

  if (lastError instanceof PipelineError) throw lastError;
  throw new PipelineError(`GET ${url} failed after ${retries} attempts: ${(lastError as Error)?.message}`, "HTTP_FAILED");
}
