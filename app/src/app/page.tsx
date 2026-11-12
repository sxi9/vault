import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { listItems } from "@/lib/db";
import { qrSvg } from "@/lib/qr";
import { uploadUrl } from "@/lib/uploads";
import { CATEGORIES, type Category, type ItemWithCounts } from "@/lib/types";

export const metadata: Metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

function isCategory(v: string | undefined): v is Category {
  return !!v && (CATEGORIES as readonly string[]).includes(v);
}

function Badges({ it }: { it: ItemWithCounts }) {
  const chips: { text: string; cls: string }[] = [];
  if (it.lost) chips.push({ text: "Reported lost", cls: "bg-danger text-white" });
  if (it.lentTo) chips.push({ text: `Lent → ${it.lentTo}`, cls: "bg-ink text-bg" });
  if (it.model3d) chips.push({ text: "3D", cls: "bg-bg text-limeInk border border-line3" });
  if (!chips.length) return null;
  return (
    <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 max-w-[calc(100%-16px)]">
      {chips.map((c) => (
        <span key={c.text} className={`pill h-[22px] border-transparent ${c.cls}`}>
          {c.text}
        </span>
      ))}
    </div>
  );
}

function ItemCard({ it, qr }: { it: ItemWithCounts; qr: string }) {
  const href = `/items/${it.id}`;
  return (
    <article className="group bg-panel border border-line rounded-item p-3 flex flex-col gap-3 transition-colors hover:border-line3">
      <div className="flex items-center justify-between px-1 pt-0.5">
        <span className="font-mono text-[12px] tracking-[0.08em] text-ink3">{it.code}</span>
        <span className="pill text-ink2">{it.category}</span>
      </div>

      <Link href={href} className="relative block aspect-[4/3] rounded-[14px] overflow-hidden bg-panel2 hover:no-underline">
        {it.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={uploadUrl(it.photo)} alt={`${it.nickname}, ${it.name}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-display font-extrabold text-[64px] text-ink5/60 tracking-[-0.04em] select-none">
              {it.nickname.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
        <Badges it={it} />
      </Link>

      <div className="px-1">
        <h2 className="font-display font-bold text-[21px] leading-[1.1] tracking-[-0.02em] text-ink">
          <Link href={href} className="text-ink hover:no-underline">
            {it.nickname}
          </Link>
        </h2>
        <p className="text-sm text-ink3 mt-1 truncate">{it.name}</p>
      </div>

      <div className="mt-auto flex items-center gap-3 px-1 pb-0.5">
        <div
          aria-hidden
          className="w-[42px] h-[42px] shrink-0 rounded-[10px] bg-white p-[4px] [&>svg]:w-full [&>svg]:h-full"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <div className="text-xs leading-snug min-w-0">
          <div className="text-ink font-semibold">
            {it.scans} {it.scans === 1 ? "scan" : "scans"}
          </div>
          <div className="text-ink4 font-mono tracking-[0.06em]">Since {new Date(it.createdAt).getFullYear()}</div>
        </div>
        <Link href={href} className="btn h-9 px-3.5 text-[13px] ml-auto hover:no-underline">
          Open
        </Link>
      </div>
    </article>
  );
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string | string[] }>;
}) {
  const sp = await searchParams;
  const catParam = Array.isArray(sp.cat) ? sp.cat[0] : sp.cat;
  const cat: Category | null = isCategory(catParam) ? catParam : null;

  const all = listItems();
  const items = cat ? all.filter((i) => i.category === cat) : all;
  const qrs = await Promise.all(items.map((i) => qrSvg(i.code, { size: 42 })));

  const chips: { label: string; href: string; active: boolean }[] = [
    { label: "All", href: "/", active: cat === null },
    ...CATEGORIES.map((c) => ({ label: c, href: `/?cat=${c}`, active: cat === c })),
  ];

  return (
    <Shell>
      <section className="mb-8">
        <p className="label mb-3">
          Inventory &middot; {all.length} {all.length === 1 ? "item" : "items"} tagged
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display font-extrabold tracking-[-0.03em] leading-[1] text-[clamp(36px,7vw,56px)]">The vault</h1>
          <p className="text-sm text-ink3 max-w-[360px]">
            Everything you have tagged. Scan counts come from finders opening the sticker page.
          </p>
        </div>
      </section>

      <nav aria-label="Category filter" className="flex flex-wrap gap-2 mb-6">
        {chips.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            aria-current={c.active ? "page" : undefined}
            className={`h-9 px-4 inline-flex items-center rounded-full text-sm font-semibold border transition-colors hover:no-underline ${
              c.active ? "bg-ink text-bg border-ink" : "border-line3 text-sub hover:text-ink hover:border-ink3"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      {all.length === 0 ? (
        <section className="card border-dashed border-line3 text-center py-14">
          <p className="label mb-3">Nothing tagged yet</p>
          <h2 className="font-display font-extrabold tracking-[-0.03em] text-[28px] leading-tight mb-3">Tag your first thing</h2>
          <p className="text-sm text-ink3 max-w-[380px] mx-auto mb-6">
            A tag mints a short code and a QR sticker. Whoever finds the item lands on a page that knows how to reach you.
          </p>
          <Link href="/items/new" className="btn btn-primary hover:no-underline">
            <span aria-hidden>+</span> Add item
          </Link>
        </section>
      ) : (
        <div className="grid gap-5 min-[720px]:gap-6 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
          {items.map((it, i) => (
            <ItemCard key={it.id} it={it} qr={qrs[i]} />
          ))}
          {items.length === 0 && (
            <p className="col-span-full text-sm text-ink3 py-6">
              Nothing in <span className="text-ink">{cat}</span> yet.
            </p>
          )}
          <Link
            href="/items/new"
            className="min-h-[260px] rounded-item border border-dashed border-line3 flex flex-col items-center justify-center gap-3 text-sub hover:text-ink hover:border-ink3 hover:no-underline transition-colors"
          >
            <span aria-hidden className="w-12 h-12 rounded-full border border-line3 flex items-center justify-center font-display text-2xl leading-none">
              +
            </span>
            <span className="font-semibold">Add new item</span>
            <span className="label">Mints the next code</span>
          </Link>
        </div>
      )}
    </Shell>
  );
}
