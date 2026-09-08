import { fetchJson, type FetchImpl } from "../http.ts";
import type { PipelineEnv } from "../env.ts";
import { PipelineError } from "../errors.ts";
import { RawTermSchema } from "./raw.ts";
import { z } from "zod";

const asArray = (body: unknown, what: string): unknown[] => {
  if (Array.isArray(body)) return body;
  if (body !== null && typeof body === "object") {
    const data = (body as { data?: unknown }).data;
    if (Array.isArray(data)) return data;
  }
  throw new PipelineError(`Hyperschedule ${what} did not return an array`, "HYPERSCHEDULE_BAD_SHAPE");
};

export const sectionsUrl = (env: PipelineEnv, term: string) => `${env.hyperscheduleBaseUrl}/v4/sections/${term}`;
export const historyUrl = (env: PipelineEnv, term: string) => `${env.hyperscheduleBaseUrl}/v4/offering-history/${term}`;
export const termsUrl = (env: PipelineEnv) => `${env.hyperscheduleBaseUrl}/v4/term/all`;
export const courseAreasUrl = (env: PipelineEnv) => `${env.hyperscheduleBaseUrl}/v4/course-areas`;

/** Build time only. Never called from a browser (brief section 7B obligation). */
export async function fetchSections(env: PipelineEnv, term: string, opts: { fetchImpl?: FetchImpl } = {}): Promise<unknown[]> {
  return asArray(await fetchJson(sectionsUrl(env, term), { fetchImpl: opts.fetchImpl }), `sections/${term}`);
}

export async function fetchOfferingHistory(env: PipelineEnv, term: string, opts: { fetchImpl?: FetchImpl } = {}): Promise<unknown[]> {
  return asArray(await fetchJson(historyUrl(env, term), { fetchImpl: opts.fetchImpl }), `offering-history/${term}`);
}

export async function fetchTerms(env: PipelineEnv, opts: { fetchImpl?: FetchImpl } = {}): Promise<{ year: number; term: string }[]> {
  const body = asArray(await fetchJson(termsUrl(env), { fetchImpl: opts.fetchImpl }), "term/all");
  return z.array(RawTermSchema).parse(body);
}

export async function fetchCourseAreas(env: PipelineEnv, opts: { fetchImpl?: FetchImpl } = {}): Promise<unknown[]> {
  return asArray(await fetchJson(courseAreasUrl(env), { fetchImpl: opts.fetchImpl }), "course-areas");
}
