import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { getOwner, listItems } from "@/lib/db";
import { tagUrl } from "@/lib/config";
import { qrSvg } from "@/lib/qr";
import type { Item } from "@/lib/types";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "Stickers" };
export const dynamic = "force-dynamic";

function stickerLine(item: Item, ownerName: string): string {
  if (item.category === "Pets") return `${item.nickname} is cared for by ${ownerName}. Scan if hurt or lost.`;
  return `${item.nickname} belongs to ${ownerName}. Reward if returned.`;
}

/** One 50 x 70 mm sticker. Physical units so it prints true to size. */
function Sticker({ item, ownerName, svg }: { item: Item; ownerName: string; svg: string }) {
  const url = tagUrl(item.code);
  return (
    <li
      className="relative flex flex-col items-center bg-paper text-paper-ink border-dashed border-paper-muted"
      style={{
        width: "50mm",
        height: "70mm",
        padding: "4mm",
        borderWidth: "0.4mm",
        borderRadius: "5mm",
        breakInside: "avoid",
        pageBreakInside: "avoid",
      }}
    >
      <div className="w-full flex items-center justify-between" style={{ height: "4mm" }}>
        <span className="inline-flex items-center" style={{ gap: "1.4mm" }}>
          <span aria-hidden className="inline-block bg-lime rotate-45" style={{ width: "2.2mm", height: "2.2mm", borderRadius: "0.3mm" }} />
          <span className="font-display font-extrabold tracking-[-0.03em] leading-none" style={{ fontSize: "8pt" }}>
            LOOT
          </span>
        </span>
        <span className="font-mono font-semibold leading-none" style={{ fontSize: "7.5pt", letterSpacing: "0.08em" }}>
          {item.code}
        </span>
      </div>

      <div
        className="bg-white [&>svg]:block [&>svg]:w-full [&>svg]:h-full"
        style={{ width: "36mm", height: "36mm", marginTop: "3mm", padding: "1.5mm", borderRadius: "1.5mm" }}
        dangerouslySetInnerHTML={{ __html: svg }}
        aria-label={`QR code for ${item.nickname}, ${item.code}`}
        role="img"
      />

      <p
        className="font-display font-extrabold tracking-[-0.02em] leading-none text-center"
        style={{ fontSize: "9pt", marginTop: "3mm" }}
      >
        IF FOUND, SCAN ME
      </p>

      <p
        className="text-center leading-[1.3] text-paper-ink"
        style={{ fontSize: "7pt", marginTop: "1.8mm", maxWidth: "42mm" }}
      >
        {stickerLine(item, ownerName)}
      </p>

      <p
        className="mt-auto font-mono text-center text-paper-muted leading-none break-all"
        style={{ fontSize: "5.5pt", letterSpacing: "0.02em" }}
      >
        {url.replace(/^https?:\/\//, "")}
      </p>
    </li>
  );
}

export default async function StickersPage() {
  const owner = getOwner();
  const items = listItems();
  const svgs = await Promise.all(items.map((i) => qrSvg(i.code, { size: 256, margin: 0 })));
  const n = items.length;

  return (
    <Shell>
      <div className="mx-auto w-full max-w-[1100px]">
        <div className="flex flex-col gap-5 min-[720px]:flex-row min-[720px]:items-end min-[720px]:justify-between mb-8">
          <div className="min-w-0">
            <p className="label mb-3">
              Sticker sheet · {n} {n === 1 ? "tag" : "tags"} · 50 × 70 mm each
            </p>
            <h1 className="font-display font-extrabold tracking-[-0.03em] leading-[1.02] text-[clamp(30px,6vw,48px)]">
              Print, cut, stick.
            </h1>
            <p className="mt-3 text-[14px] text-ink2 max-w-[52ch] leading-relaxed">
              One sticker per tagged item, true to size on A4. Use waterproof label paper for bikes, pets and anything that
              lives outside. Each QR encodes the item&rsquo;s public tag page.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PrintButton disabled={n === 0} />
          </div>
        </div>

        {n === 0 ? (
          <div className="card">
            <p className="label mb-2">Nothing to print</p>
            <p className="text-sm text-ink2 mb-5">Tag something first and its sticker shows up here.</p>
            <Link href="/items/new" className="btn btn-primary hover:no-underline">
              <span aria-hidden>+</span> Add item
            </Link>
          </div>
        ) : (
          <div className="rounded-[28px] bg-panel border border-line p-3 min-[720px]:p-6 overflow-hidden">
            <ul
              id="print-sheet"
              className="list-none m-0 mx-auto box-border grid justify-center bg-white text-paper-ink w-[210mm] max-w-full p-[10mm] gap-[6mm] rounded-[6px] shadow-[0_24px_48px_rgba(0,0,0,.5)] [grid-template-columns:repeat(auto-fill,50mm)]"
            >
              {items.map((item, i) => (
                <Sticker key={item.id} item={item} ownerName={owner.name} svg={svgs[i]!} />
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 px-1 text-[12px] text-ink4 leading-relaxed">
          Dashed line is the cut line. Need a single tag as an image? Open an item and download its QR as PNG.
        </p>
      </div>
    </Shell>
  );
}
