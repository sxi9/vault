import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { ModelSection } from "@/components/ModelSection";
import { MAX_PHOTO_BYTES, PHOTO_EXTENSIONS, tagUrl } from "@/lib/config";
import { countScans, getItem, listEvents } from "@/lib/db";
import { qrSvg } from "@/lib/qr";
import { uploadUrl } from "@/lib/uploads";
import { CATEGORIES, type Event, type EventType } from "@/lib/types";
import {
  lendAction,
  removePhotoAction,
  returnAction,
  toggleLostAction,
  updatePrivateAction,
  updatePublicAction,
  uploadPhotoAction,
} from "../actions";
import { CopyLinkButton } from "./CopyLinkButton";
import { DeleteItemButton } from "./DeleteItemButton";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type Search = Promise<{ error?: string; saved?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const item = getItem(id);
  return { title: item ? `${item.nickname} · ${item.code}` : "Item" };
}

const GLYPH: Record<EventType, { text: string; cls: string }> = {
  scan: { text: "QR", cls: "bg-lime text-on-lime" },
  message: { text: "MSG", cls: "bg-ink text-bg" },
  location: { text: "PIN", cls: "bg-lime text-on-lime" },
  lost: { text: "LST", cls: "bg-danger text-white" },
  found: { text: "FND", cls: "bg-lime text-on-lime" },
  lend: { text: "LND", cls: "bg-panel2 text-ink2" },
  return: { text: "RET", cls: "bg-panel2 text-ink2" },
  created: { text: "NEW", cls: "bg-lime text-on-lime" },
  note: { text: "LOG", cls: "bg-panel2 text-ink2" },
};

const TITLE: Record<EventType, string> = {
  scan: "Sticker scanned",
  message: "Message from a finder",
  location: "Location shared",
  lost: "Reported lost",
  found: "Marked found",
  lend: "Lent out",
  return: "Returned",
  created: "Tagged",
  note: "Note",
};

function when(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function dueLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function EventRow({ e }: { e: Event }) {
  const g = GLYPH[e.type] ?? GLYPH.note;
  return (
    <li className="flex items-start gap-3 py-3 border-t border-line2 first:border-t-0">
      <span className={`w-11 h-11 shrink-0 rounded-[12px] flex items-center justify-center font-mono text-[11px] tracking-[0.08em] ${g.cls}`}>
        {g.text}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-semibold text-sm text-ink">{TITLE[e.type] ?? e.type}</p>
          <time dateTime={e.createdAt} className="font-mono text-[11px] text-ink4 shrink-0">
            {when(e.createdAt)}
          </time>
        </div>
        <p className="text-xs text-ink3 mt-0.5">
          {e.who}
          {e.contact ? ` · ${e.contact}` : ""}
        </p>
        {e.text && <p className="text-sm text-ink2 mt-1.5 border-l-2 border-line3 pl-3">{e.text}</p>}
      </div>
    </li>
  );
}

export default async function ItemPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const [{ id }, { error, saved }] = await Promise.all([params, searchParams]);
  const item = getItem(id);
  if (!item) notFound();

  const qr = await qrSvg(item.code, { size: 156 });
  const events = listEvents({ itemId: item.id, limit: 25 });
  const scans = countScans(item.id);
  const url = tagUrl(item.code);
  const [s1, s2] = item.publicStats;
  const idInput = <input type="hidden" name="id" value={item.id} />;

  return (
    <Shell>
      <p className="label mb-3">
        <Link href="/" className="text-ink3 hover:text-ink">
          Inventory
        </Link>{" "}
        &middot; {item.code}
      </p>

      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="font-mono text-[13px] tracking-[0.08em] text-ink">{item.code}</span>
            <span className="pill text-ink2">{item.category}</span>
            {item.lost && <span className="pill bg-danger border-transparent text-white">Reported lost</span>}
            {item.lentTo && <span className="pill bg-ink border-transparent text-bg">Lent &rarr; {item.lentTo}</span>}
            {item.model3d && <span className="pill text-limeInk border-limeInk/40">3D</span>}
          </div>
          <h1 className="font-display font-extrabold tracking-[-0.03em] leading-[1] text-[clamp(34px,7vw,56px)] break-words">{item.nickname}</h1>
          <p className="text-ink3 mt-2">{item.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/t/${item.code.toLowerCase()}`} className="btn hover:no-underline">
            Open tag page
          </Link>
        </div>
      </header>

      {error && (
        <p role="alert" className="mb-6 tile border border-danger text-sm text-danger font-semibold">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="mb-6 tile text-sm text-limeInk font-semibold">
          Saved.
        </p>
      )}

      <div className="grid gap-6 min-[960px]:grid-cols-[1.1fr_1fr] items-start">
        {/* ---------- left column ---------- */}
        <div className="flex flex-col gap-6 min-w-0">
          <section id="photo" className="card">
            <div className="flex items-center justify-between mb-4">
              <p className="label">Photo</p>
              <span className="font-mono text-[11px] text-ink4">
                {PHOTO_EXTENSIONS.join(" / ")} &middot; {Math.round(MAX_PHOTO_BYTES / 1024 / 1024)} MB max
              </span>
            </div>
            <div className="aspect-[4/3] rounded-[18px] overflow-hidden bg-panel2 mb-4">
              {item.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={uploadUrl(item.photo)} alt={`${item.nickname}, ${item.name}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-ink5">
                  <span className="font-display font-extrabold text-[72px] leading-none tracking-[-0.04em]">{item.nickname.slice(0, 1).toUpperCase()}</span>
                  <span className="label">No photo yet</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <form action={uploadPhotoAction} className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                {idInput}
                <input
                  type="file"
                  name="photo"
                  required
                  accept={PHOTO_EXTENSIONS.map((e) => `.${e}`).join(",")}
                  className="text-sm text-ink3 w-full min-w-0 min-[720px]:w-auto file:mr-3 file:h-9 file:px-3 file:rounded-full file:border file:border-line3 file:bg-transparent file:text-ink file:text-[13px] file:font-semibold file:cursor-pointer"
                />
                <button type="submit" className="btn btn-primary h-10">
                  {item.photo ? "Replace photo" : "Upload photo"}
                </button>
              </form>
              {item.photo && (
                <form action={removePhotoAction}>
                  {idInput}
                  <button type="submit" className="btn btn-danger h-10">
                    Remove
                  </button>
                </form>
              )}
            </div>
          </section>

          <ModelSection item={item} editable />

          <section id="qr" className="card">
            <p className="label mb-4">QR tag</p>
            <div className="flex flex-col min-[520px]:flex-row gap-5 items-start">
              <div
                aria-label={`QR code for ${item.code}`}
                role="img"
                className="w-[172px] h-[172px] shrink-0 rounded-[16px] bg-white p-2 [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
              <div className="min-w-0 flex-1 flex flex-col gap-3">
                <p className="text-sm text-ink2">
                  Anyone who scans this lands on <span className="text-ink font-semibold">{item.nickname}</span>&apos;s page.
                </p>
                <p className="font-mono text-[12px] text-ink3 break-all tile">{url}</p>
                <p className="text-xs text-ink4">
                  {scans} finder {scans === 1 ? "scan" : "scans"} so far.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/t/${item.code.toLowerCase()}`} className="btn btn-primary h-10 hover:no-underline">
                    Open tag page
                  </Link>
                  <a href={`/api/qr/${item.code.toLowerCase()}`} download={`loot-${item.code.toLowerCase()}.png`} className="btn hover:no-underline">
                    Download PNG
                  </a>
                  <CopyLinkButton url={url} />
                </div>
              </div>
            </div>
          </section>

          <section id="lost" className={`card transition-colors ${item.lost ? "border-danger" : ""}`}>
            <form action={toggleLostAction} className="flex items-center justify-between gap-4">
              {idInput}
              <div className="min-w-0">
                <p className={`label mb-1 ${item.lost ? "text-danger" : ""}`}>{item.lost ? "Lost mode is on" : "Report as lost"}</p>
                <p className="text-sm text-ink2">
                  {item.lost
                    ? "The tag page shows a red banner and asks finders to get in touch straight away."
                    : "Turns on a red banner on the tag page and marks the item in your map and feed."}
                </p>
              </div>
              <button
                type="submit"
                role="switch"
                aria-checked={item.lost}
                aria-label={item.lost ? "Mark as found" : "Report as lost"}
                className={`relative shrink-0 w-[54px] h-[32px] rounded-full transition-colors ${item.lost ? "bg-danger" : "bg-[var(--track)]"}`}
              >
                <span
                  aria-hidden
                  className={`absolute top-[3px] w-[26px] h-[26px] rounded-full bg-white shadow transition-[left] ${item.lost ? "left-[25px]" : "left-[3px]"}`}
                />
              </button>
            </form>
          </section>

          <section id="lend" className="card">
            <p className="label mb-4">Lending</p>
            {item.lentTo ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-display font-bold text-[20px] tracking-[-0.02em] leading-tight">
                    {item.nickname} is with {item.lentTo}
                  </p>
                  <p className="text-sm text-ink3 mt-1">
                    {item.lentDue ? `Due back ${dueLabel(item.lentDue)}.` : "No due date."} The tag page says it is borrowed, not stolen.
                  </p>
                </div>
                <form action={returnAction}>
                  {idInput}
                  <button type="submit" className="btn btn-primary h-10">
                    Mark returned
                  </button>
                </form>
              </div>
            ) : (
              <form action={lendAction} className="grid gap-3 min-[520px]:grid-cols-[1.4fr_1fr_auto] items-end">
                {idInput}
                <label className="flex flex-col gap-2">
                  <span className="label">Lend to</span>
                  <input className="input" name="lentTo" required maxLength={80} placeholder="Sam" />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="label">Due back</span>
                  <input className="input" type="date" name="lentDue" />
                </label>
                <button type="submit" className="btn h-11">
                  Mark as lent
                </button>
              </form>
            )}
          </section>
        </div>

        {/* ---------- right column ---------- */}
        <div className="flex flex-col gap-6 min-w-0">
          <section id="edit" className="card">
            <div className="mb-5">
              <p className="label mb-1">Tag page details</p>
              <p className="text-xs text-ink4">Public. Code {item.code} stays the same even if you change the category.</p>
            </div>
            <form action={updatePublicAction} className="flex flex-col gap-4">
              {idInput}
              <div className="grid gap-4 min-[600px]:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="label">Nickname</span>
                  <input className="input" name="nickname" required maxLength={60} defaultValue={item.nickname} />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="label">Name / model</span>
                  <input className="input" name="name" required maxLength={120} defaultValue={item.name} />
                </label>
              </div>
              <fieldset>
                <legend className="label mb-2">Category</legend>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <label key={c} className="cursor-pointer">
                      <input type="radio" name="category" value={c} defaultChecked={item.category === c} className="peer sr-only" />
                      <span className="h-9 px-4 inline-flex items-center rounded-full text-sm font-semibold border border-line3 text-sub transition-colors peer-checked:bg-ink peer-checked:text-bg peer-checked:border-ink peer-focus-visible:outline-2 peer-focus-visible:outline-lime">
                        {c}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex flex-col gap-2">
                <span className="label">If found, say</span>
                <textarea className="input" name="finderNote" maxLength={600} rows={3} defaultValue={item.finderNote} />
              </label>
              <div className="flex flex-col gap-3">
                <span className="label">Public stats (up to 2)</span>
                <div className="grid grid-cols-[1fr_1.4fr] gap-3">
                  <input className="input" name="stat1Label" aria-label="Stat 1 label" maxLength={40} placeholder="Colour" defaultValue={s1?.label ?? ""} />
                  <input className="input" name="stat1Value" aria-label="Stat 1 value" maxLength={60} placeholder="Lime" defaultValue={s1?.value ?? ""} />
                </div>
                <div className="grid grid-cols-[1fr_1.4fr] gap-3">
                  <input className="input" name="stat2Label" aria-label="Stat 2 label" maxLength={40} placeholder="Size" defaultValue={s2?.label ?? ""} />
                  <input className="input" name="stat2Value" aria-label="Stat 2 value" maxLength={60} placeholder="56 cm" defaultValue={s2?.value ?? ""} />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary h-10">
                  Save details
                </button>
              </div>
            </form>
          </section>

          <section id="vault" className="rounded-card border border-line3 bg-bg p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <p className="label text-ink">Private vault</p>
              <span className="pill text-limeInk border-limeInk/40">Only you &middot; never on the tag</span>
            </div>
            <form action={updatePrivateAction} className="flex flex-col gap-4">
              {idInput}
              <label className="flex flex-col gap-2">
                <span className="label">Serial / frame / microchip</span>
                <input className="input font-mono" name="serial" maxLength={120} defaultValue={item.serial ?? ""} />
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Purchase info</span>
                <input className="input" name="purchaseInfo" maxLength={300} defaultValue={item.purchaseInfo ?? ""} placeholder="Where, when, how much" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Private notes</span>
                <textarea className="input" name="privateNotes" maxLength={2000} rows={3} defaultValue={item.privateNotes ?? ""} />
              </label>
              <div className="flex justify-end">
                <button type="submit" className="btn h-10">
                  Save private vault
                </button>
              </div>
            </form>
          </section>

          <section id="events" className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="label">Recent events</p>
              <Link href="/activity" className="font-mono text-[11px] tracking-[0.1em] uppercase">
                Full feed
              </Link>
            </div>
            {events.length ? (
              <ul>
                {events.map((e) => (
                  <EventRow key={e.id} e={e} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink3 py-3">Nothing yet. Scans and messages from finders land here.</p>
            )}
          </section>

          <section className="flex flex-wrap items-center justify-between gap-4 px-2">
            <p className="text-xs text-ink4 max-w-[320px]">
              Deleting removes the code, photo, 3D model and history. Printed stickers for {item.code} will point to nothing.
            </p>
            <DeleteItemButton id={item.id} nickname={item.nickname} />
          </section>
        </div>
      </div>
    </Shell>
  );
}
