import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { LostMapClient } from "@/components/LostMapClient";
import type { MapPin } from "@/components/LostMap";
import { listEvents, listItems, listPins } from "@/lib/db";
import type { Event, EventType } from "@/lib/types";

export const metadata: Metadata = { title: "Activity" };
export const dynamic = "force-dynamic";

// ---------- presentation helpers ----------

type Tone = "lime" | "red" | "ink" | "panel";

const GLYPH: Record<EventType, { glyph: string; tone: Tone }> = {
  scan: { glyph: "QR", tone: "lime" },
  message: { glyph: "MSG", tone: "ink" },
  location: { glyph: "PIN", tone: "lime" },
  lost: { glyph: "LST", tone: "red" },
  found: { glyph: "FND", tone: "lime" },
  lend: { glyph: "LND", tone: "panel" },
  return: { glyph: "RET", tone: "panel" },
  created: { glyph: "NEW", tone: "panel" },
  note: { glyph: "NOTE", tone: "panel" },
};

const TONE_CLASS: Record<Tone, string> = {
  lime: "bg-lime text-on-lime",
  red: "bg-danger text-white",
  ink: "bg-ink text-bg",
  panel: "bg-panel2 text-ink2",
};

type ItemRef = { id: string; nickname: string; code: string; lost: boolean };

function title(e: Event, item: ItemRef | undefined): string {
  const nick = item?.nickname ?? "an untagged item";
  switch (e.type) {
    case "scan": return `${nick} was scanned`;
    case "message": return `Message about ${nick}`;
    case "location": return `${nick} was spotted`;
    case "lost": return `${nick} reported lost`;
    case "found": return `${nick} is back`;
    case "lend": return `${nick} lent out`;
    case "return": return `${nick} returned`;
    case "created": return item ? `${nick} tagged as ${item.code}` : "New tag";
    case "note": return `Note on ${nick}`;
  }
}

function meta(e: Event): string {
  const bits = [e.who.trim() || "Someone"];
  if (e.type === "message") {
    // body is quoted below the row
  } else if (e.type === "created") {
    // title already says what was tagged
  } else if (e.text) {
    bits.push(e.text);
  } else if (e.lat != null && e.lng != null) {
    bits.push(`${e.lat.toFixed(4)}, ${e.lng.toFixed(4)}`);
  }
  return bits.join(" \u00b7 ");
}

function relTime(iso: string): string {
  const nowMs = Date.now();
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.round((nowMs - t) / 1000));
  if (s < 45) return "now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w}w`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.round(d / 365)}y`;
}

function absTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]{6,}$/;

function ContactLink({ contact }: { contact: string }) {
  const c = contact.trim();
  if (!c) return null;
  const cls = "font-mono text-[12px] text-limeInk underline decoration-line3 underline-offset-4 hover:decoration-limeInk break-all";
  if (EMAIL_RE.test(c)) return <a className={cls} href={`mailto:${c}`}>{c}</a>;
  if (PHONE_RE.test(c)) return <a className={cls} href={`tel:${c.replace(/[\s().-]/g, "")}`}>{c}</a>;
  return <span className="font-mono text-[12px] text-ink break-words">{c}</span>;
}

// ---------- page ----------

export default async function ActivityPage() {
  const events = listEvents({ limit: 200 });
  const items = new Map<string, ItemRef>(
    listItems().map((i) => [i.id, { id: i.id, nickname: i.nickname, code: i.code, lost: i.lost }]),
  );
  const pins: MapPin[] = listPins().map((p) => ({
    id: p.id,
    lat: p.lat as number,
    lng: p.lng as number,
    text: p.text,
    createdAt: p.createdAt,
    itemNickname: p.itemNickname,
    itemCode: p.itemCode,
    itemLost: p.itemLost,
  }));
  const lostCount = [...items.values()].filter((i) => i.lost).length;

  return (
    <Shell>
      <div className="grid gap-8 min-[960px]:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] min-[960px]:gap-10 items-start">
        {/* ---------- feed ---------- */}
        <section className="min-w-0">
          <p className="label mb-3">
            Activity · {events.length} {events.length === 1 ? "event" : "events"}
          </p>
          <h1 className="font-display font-extrabold tracking-[-0.03em] leading-[1.02] text-[clamp(30px,6vw,48px)] mb-6">
            Who touched your stuff
          </h1>

          <div className="card p-2 min-[720px]:p-3">
            {events.length === 0 ? (
              <div className="tile text-sm text-ink2 m-2">
                Nothing yet. Stick a tag on something and this fills up the first time someone scans it.
              </div>
            ) : (
              <ol className="flex flex-col">
                {events.map((e) => {
                  const item = e.itemId ? items.get(e.itemId) : undefined;
                  const g = GLYPH[e.type] ?? GLYPH.note;
                  const m = meta(e);
                  return (
                    <li
                      key={e.id}
                      className="flex items-start gap-3 min-[720px]:gap-4 px-3 py-3.5 min-[720px]:px-4 rounded-[18px] border-b border-line2 last:border-b-0 hover:bg-panel2/60 transition-colors"
                    >
                      <span
                        aria-hidden
                        className={`shrink-0 w-11 h-11 rounded-[12px] grid place-items-center font-mono text-[11px] font-semibold tracking-[0.08em] ${TONE_CLASS[g.tone]}`}
                      >
                        {g.glyph}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <p className="font-semibold text-[15px] leading-snug text-ink truncate">
                            {item ? (
                              <Link href={`/items/${item.id}`} className="text-ink hover:text-limeInk hover:no-underline">
                                {title(e, item)}
                              </Link>
                            ) : (
                              title(e, item)
                            )}
                          </p>
                          {item && (
                            <span className="hidden min-[480px]:inline font-mono text-[11px] tracking-[0.1em] uppercase text-ink4 shrink-0">
                              {item.code}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-ink3 leading-snug mt-0.5 break-words">{m}</p>

                        {e.type === "message" && e.text && (
                          <blockquote className="mt-2 tile py-2.5 px-3.5 text-[14px] text-ink leading-relaxed border-l-2 border-lime rounded-l-[6px] whitespace-pre-wrap break-words">
                            {e.text}
                          </blockquote>
                        )}
                        {e.type === "message" && e.contact && (
                          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="label">Reach them</span>
                            <ContactLink contact={e.contact} />
                          </p>
                        )}
                      </div>

                      <time
                        dateTime={e.createdAt}
                        title={absTime(e.createdAt)}
                        className="shrink-0 font-mono text-[11px] tracking-[0.08em] uppercase text-ink4 pt-1"
                      >
                        {relTime(e.createdAt)}
                      </time>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>

        {/* ---------- map ---------- */}
        <aside className="min-w-0 min-[960px]:sticky min-[960px]:top-24">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="label">Lost-item map</p>
            <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-ink4">
              {pins.length} {pins.length === 1 ? "pin" : "pins"}
              {lostCount > 0 && <span className="text-danger"> · {lostCount} lost</span>}
            </p>
          </div>

          <div className="card p-3">
            <LostMapClient pins={pins} />

            <div className="flex items-center gap-4 px-2 pt-3 pb-1">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] uppercase text-ink3">
                <span aria-hidden className="w-2.5 h-2.5 rounded-full bg-lime" /> Found
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] uppercase text-ink3">
                <span aria-hidden className="w-2.5 h-2.5 rounded-full bg-danger" /> In lost mode
              </span>
            </div>

            {pins.length === 0 ? (
              <p className="tile mt-2 text-[13px] text-ink2">
                No pins yet. Pins appear when a finder taps &ldquo;Share where I found it&rdquo; on a tag page.
              </p>
            ) : (
              <ol className="mt-2 flex flex-col max-h-[320px] overflow-y-auto">
                {pins.map((p) => (
                  <li key={p.id} className="flex items-start gap-3 px-2 py-2.5 border-b border-line2 last:border-b-0">
                    <span
                      aria-hidden
                      className={`mt-1.5 shrink-0 w-2.5 h-2.5 rounded-full ${p.itemLost ? "bg-danger" : "bg-lime"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold leading-snug text-ink truncate">
                        {p.itemNickname}
                        <span className="ml-2 font-mono text-[10px] tracking-[0.1em] uppercase text-ink4 font-normal">{p.itemCode}</span>
                      </p>
                      <p className="text-[13px] text-ink3 leading-snug break-words">
                        {p.text || `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`}
                      </p>
                    </div>
                    <time dateTime={p.createdAt} title={absTime(p.createdAt)} className="shrink-0 font-mono text-[11px] uppercase text-ink4 pt-0.5">
                      {relTime(p.createdAt)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <p className="mt-3 px-1 text-[12px] text-ink4 leading-relaxed">
            Pins come from finders who tap &ldquo;Share where I found it&rdquo;. Items in lost mode show in red.
          </p>
        </aside>
      </div>
    </Shell>
  );
}
