import { getItemByCode } from "@/lib/db";
import { qrPng } from "@/lib/qr";

// GET /api/qr/<code>  (a trailing ".png" is tolerated): the tag's QR as a
// downloadable PNG. Owner-only via proxy. 404 when no item has that code.
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const raw = (await ctx.params).code;
  const code = raw.replace(/\.png$/i, "").trim();
  if (!/^[A-Za-z]{2}-\d{3,}$/.test(code)) return new Response("Not found", { status: 404 });
  const item = getItemByCode(code);
  if (!item) return new Response("Not found", { status: 404 });
  const png = await qrPng(item.code);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.byteLength),
      "Content-Disposition": `attachment; filename="loot-${item.code.toLowerCase()}.png"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
