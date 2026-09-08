import { fetchJson, type FetchImpl } from "../http.ts";
import type { PipelineEnv } from "../env.ts";
import { CoursedogSearchResponseSchema, type RawCoursedogCourse } from "./raw.ts";
import { PipelineError } from "../errors.ts";

const PAGE_SIZE = 3000;

export function coursedogSearchUrl(env: PipelineEnv, skip: number, limit = PAGE_SIZE): string {
  const params = new URLSearchParams({
    catalogId: env.coursedogCatalogId,
    skip: String(skip),
    limit: String(limit),
    orderBy: "catalogDisplayName",
    formatDependents: "false",
    ignoreEffectiveDating: "true",
  });
  // The literal `$` in `/search/$filters` is part of the documented path.
  return `${env.coursedogBaseUrl}/api/v1/cm/pomona/courses/search/$filters?${params.toString()}`;
}

/**
 * Every Pomona course. Coursedog answers 401 unless the Origin header names the
 * public catalog, so that header is not optional decoration — it is the auth.
 */
export async function fetchCoursedogCourses(
  env: PipelineEnv,
  opts: { fetchImpl?: FetchImpl } = {},
): Promise<{ records: RawCoursedogCourse[]; sourceUrl: string }> {
  const headers = { Origin: env.coursedogOrigin, Accept: "application/json" };
  const records: RawCoursedogCourse[] = [];
  const firstUrl = coursedogSearchUrl(env, 0);

  let skip = 0;
  for (;;) {
    const url = coursedogSearchUrl(env, skip);
    const body = await fetchJson(url, { headers, fetchImpl: opts.fetchImpl });
    const parsed = CoursedogSearchResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new PipelineError(
        `Coursedog response did not match the expected envelope at skip=${skip}`,
        "COURSEDOG_BAD_SHAPE",
        undefined,
        parsed.error.issues.slice(0, 20),
      );
    }
    const page = parsed.data.data;
    records.push(...page);
    const total = parsed.data.listLength;
    if (page.length === 0) break;
    if (typeof total === "number" && records.length >= total) break;
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return { records, sourceUrl: firstUrl };
}
