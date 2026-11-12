import fs from "node:fs";
import { MIME, extensionOf, uploadPath } from "@/lib/uploads";

// Serves stored photos and 3D models. Names are random, so a URL is only
// known to whoever was shown it (the tag page or the owner).
export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  let file: string;
  try {
    file = uploadPath(name);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!fs.existsSync(file)) return new Response("Not found", { status: 404 });
  const stat = fs.statSync(file);
  const stream = fs.createReadStream(file);
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": MIME[extensionOf(name)] || "application/octet-stream",
      "Content-Length": String(stat.size),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
