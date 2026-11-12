import { z } from "zod";
import { addEvent } from "@/lib/db";
import { honeypot, invalid, prepareFinderRequest, type FinderContext } from "@/lib/finder";

// Logged by the tag page once per session (client-side guard). The page
// itself never writes on render so prefetches and bots do not double count.
const Scan = z.object({ website: honeypot });

export async function POST(req: Request, ctx: FinderContext) {
  const p = await prepareFinderRequest(req, ctx);
  if (!p.ok) return p.res;
  const parsed = Scan.safeParse(p.body);
  if (!parsed.success) return invalid(parsed.error);
  addEvent({ itemId: p.item.id, type: "scan", who: "Finder" });
  return Response.json({ ok: true });
}
