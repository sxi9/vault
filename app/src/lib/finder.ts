// Shared plumbing for the public finder route handlers under /api/t/[code]/*.
// Each handler: find the item by code (404), rate limit per IP (429), parse
// a JSON or form body, validate with zod (400), then write one event.
import { z } from "zod";
import { getItemByCode } from "@/lib/db";
import type { Item } from "@/lib/types";
import { clientKey, rateLimited } from "@/lib/ratelimit";

export type FinderContext = { params: Promise<{ code: string }> };

type Prepared = { ok: true; item: Item; body: Record<string, unknown> } | { ok: false; res: Response };

/** Looks up the item, applies the rate limit and reads the body. */
export async function prepareFinderRequest(req: Request, ctx: FinderContext): Promise<Prepared> {
  const { code } = await ctx.params;
  const item = getItemByCode(code);
  if (!item) return { ok: false, res: Response.json({ error: "not found" }, { status: 404 }) };
  if (rateLimited(clientKey(req))) {
    return { ok: false, res: Response.json({ error: "too many requests" }, { status: 429 }) };
  }
  return { ok: true, item, body: await readBody(req) };
}

/** Accepts application/json or a plain HTML form post. */
async function readBody(req: Request): Promise<Record<string, unknown>> {
  const type = req.headers.get("content-type") || "";
  try {
    if (type.includes("application/json")) {
      const j = await req.json();
      return j && typeof j === "object" ? (j as Record<string, unknown>) : {};
    }
    if (type.includes("form")) {
      const fd = await req.formData();
      const out: Record<string, unknown> = {};
      fd.forEach((v, k) => { out[k] = typeof v === "string" ? v : ""; });
      return out;
    }
  } catch {
    /* empty or malformed body → {} */
  }
  return {};
}

/** Honeypot: bots fill every field; humans never see `website`. */
export const honeypot = z.string().max(0).optional().or(z.literal(""));

const trimmed = (max: number) => z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().max(max));

export const nameField = trimmed(80);
export const contactField = trimmed(160);
export const messageField = trimmed(2000);
export const placeField = trimmed(200);

/** "52.47" from a form or 52.47 from JSON → number; "" → undefined. */
export const coord = (min: number, max: number) =>
  z.preprocess((v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    if (typeof v === "string") return Number(v);
    return v;
  }, z.number().min(min).max(max).optional());

export function invalid(err: z.ZodError): Response {
  const first = err.issues[0];
  return Response.json({ error: first ? `${first.path.join(".") || "body"}: ${first.message}` : "invalid" }, { status: 400 });
}

/** Finder display name for the event feed. */
export function finderName(name: string | undefined): string {
  const n = (name ?? "").trim();
  return n.length ? n : "Finder";
}
