import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { CATEGORIES } from "@/lib/types";
import { createItemAction } from "../actions";

export const metadata: Metadata = { title: "Add item" };
export const dynamic = "force-dynamic";

const DEFAULT_NOTE =
  "If you found this, thank you. Please message me and I will come and get it. There is a reward.";

export default async function NewItemPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <Shell>
      <div className="max-w-[760px] mx-auto">
        <p className="label mb-3">
          <Link href="/" className="text-ink3 hover:text-ink">
            Inventory
          </Link>{" "}
          &middot; New tag
        </p>
        <h1 className="font-display font-extrabold tracking-[-0.03em] leading-[1] text-[clamp(32px,6vw,48px)] mb-3">Tag something</h1>
        <p className="text-sm text-ink3 mb-8 max-w-[520px]">
          Saving mints the next code for its category and a QR sticker. You can add a photo and a 3D scan on the next screen.
        </p>

        {error && (
          <p role="alert" className="mb-6 tile border border-danger text-sm text-danger font-semibold">
            {error}
          </p>
        )}

        <form action={createItemAction} className="flex flex-col gap-6">
          <section className="card flex flex-col gap-5">
            <p className="label">What is it</p>
            <div className="grid gap-4 min-[600px]:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="label">Nickname</span>
                <input className="input" name="nickname" required maxLength={60} placeholder="Comet" autoFocus />
                <span className="text-xs text-ink4">Shown big on the tag page.</span>
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Name / model</span>
                <input className="input" name="name" required maxLength={120} placeholder="Canyon Endurace CF 7" />
                <span className="text-xs text-ink4">What a finder sees it as.</span>
              </label>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="label mb-2">Category</legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c, i) => (
                  <label key={c} className="cursor-pointer">
                    <input type="radio" name="category" value={c} defaultChecked={i === 0} className="peer sr-only" />
                    <span className="h-9 px-4 inline-flex items-center rounded-full text-sm font-semibold border border-line3 text-sub transition-colors peer-checked:bg-ink peer-checked:text-bg peer-checked:border-ink peer-focus-visible:outline-2 peer-focus-visible:outline-lime">
                      {c}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="card flex flex-col gap-5">
            <div>
              <p className="label mb-1">On the tag page</p>
              <p className="text-xs text-ink4">Public. Anyone who scans the sticker reads this.</p>
            </div>
            <label className="flex flex-col gap-2">
              <span className="label">If found, say</span>
              <textarea className="input" name="finderNote" maxLength={600} defaultValue={DEFAULT_NOTE} rows={3} />
            </label>

            <div className="flex flex-col gap-3">
              <span className="label">Public stats (up to 2)</span>
              {[1, 2].map((n) => (
                <div key={n} className="grid grid-cols-[1fr_1.4fr] gap-3">
                  <input className="input" name={`stat${n}Label`} aria-label={`Stat ${n} label`} maxLength={40} placeholder={n === 1 ? "Colour" : "Size"} />
                  <input className="input" name={`stat${n}Value`} aria-label={`Stat ${n} value`} maxLength={60} placeholder={n === 1 ? "Lime" : "56 cm"} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-card border border-line3 bg-bg p-6 flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="label text-ink">Private vault</p>
              <span className="pill text-limeInk border-limeInk/40">Only you &middot; never on the tag</span>
            </div>
            <div className="grid gap-4 min-[600px]:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="label">Serial / frame / microchip</span>
                <input className="input" name="serial" maxLength={120} placeholder="WTU 123 456" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Purchase info</span>
                <input className="input" name="purchaseInfo" maxLength={300} placeholder="Bought 2022, Bike shop, 2,400 EUR" />
              </label>
            </div>
            <label className="flex flex-col gap-2">
              <span className="label">Private notes</span>
              <textarea className="input" name="privateNotes" maxLength={2000} rows={3} placeholder="Insurance policy, lock combination, anything you need later." />
            </label>
          </section>

          <div className="flex flex-wrap items-center gap-3 justify-end">
            <Link href="/" className="btn hover:no-underline">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary">
              Mint tag
            </button>
          </div>
        </form>
      </div>
    </Shell>
  );
}
