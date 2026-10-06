import { StudentPlanSchema } from "@sageplan/shared";
import type { StudentPlan } from "@sageplan/shared";
import { migratePlan } from "../plan/migratePlan.ts";

/**
 * A plan carried in a URL FRAGMENT.
 *
 * The fragment is the whole point: a browser never sends it to a server, so a
 * shared link cannot put a student's record in anyone's access log, including
 * the host serving this page. Compressed because a 32-course record is several
 * kilobytes of JSON, and base64url because a fragment must survive being pasted
 * into a message.
 */
export const SHARE_LINK_WARN_LENGTH = 8000;
export const FRAGMENT_PREFIX = "#plan=";

export async function encodePlan(plan: StudentPlan): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(plan));
  return toBase64Url(await collect(streamOf(bytes).pipeThrough(new CompressionStream("deflate-raw"))));
}

export type DecodeResult =
  | { ok: true; plan: StudentPlan }
  | { ok: false; reason: "corrupt" | "newer" | "invalid"; detail: string };

export async function decodePlan(encoded: string): Promise<DecodeResult> {
  let json: string;
  try {
    const bytes = fromBase64Url(encoded.trim());
    const decompressed = await collect(streamOf(bytes).pipeThrough(new DecompressionStream("deflate-raw")));
    json = new TextDecoder().decode(decompressed);
  } catch {
    return { ok: false, reason: "corrupt", detail: "This link is damaged and could not be read." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: "corrupt", detail: "This link is damaged and could not be read." };
  }

  // One path for every plan entering the app, so a share link is validated and
  // migrated exactly like an imported file or a stored record.
  const migrated = migratePlan(parsed);
  if (!migrated.ok) return { ok: false, reason: migrated.reason, detail: migrated.detail };
  return { ok: true, plan: StudentPlanSchema.parse(migrated.plan) };
}

/**
 * Built directly rather than through Blob.stream(): jsdom's Blob has no
 * stream(), so going via Blob would make this code untestable outside a real
 * browser for no benefit.
 */
function streamOf(bytes: Uint8Array): ReadableStream<Uint8Array<ArrayBuffer>> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(bytes));
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value as Uint8Array);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) throw new Error("not base64url");
  const padded = text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
