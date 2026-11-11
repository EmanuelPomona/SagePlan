import type { BeforeSendEvent } from "@vercel/analytics/react";

/**
 * Vercel's analytics script reports `location.href`, fragment included. A share
 * link carries the student's whole plan in `#plan=…`, and the README promises
 * that payload never reaches any host. Count the page, never its fragment or
 * query: the path is all a page-view count needs.
 */
export function redactPageView(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = event.url.split(/[?#]/, 1)[0] ?? event.url;
  return url === event.url ? event : { ...event, url };
}
