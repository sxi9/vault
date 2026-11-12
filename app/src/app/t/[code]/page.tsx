import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getItemByCode, getOwner } from "@/lib/db";
import { uploadUrl } from "@/lib/uploads";
import { ModelSection } from "@/components/ModelSection";
import { FinderActions } from "./FinderActions";

// Public tag page. Anyone who scans a sticker lands here. It reads only the
// public fields of the item (never serial / purchaseInfo / privateNotes) and
// never writes on render: the scan is logged by FinderActions on the client.

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const item = getItemByCode(code);
  if (!item) return { title: "Not found", robots: { index: false } };
  return {
    title: `${item.nickname} · found it?`,
    description: `${item.name} · tag ${item.code}. Found it? Reach the owner here.`,
    robots: { index: false, follow: false },
  };
}

/** mono uppercase eyebrow, paper-muted (the shared .label is tuned for dark panels) */
const EYEBROW = "font-mono text-[11px] uppercase tracking-[0.12em] text-paper-muted";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]{6,}$/;

function ContactLink({ contact }: { contact: string }) {
  const c = contact.trim();
  if (!c) return null;
  const cls = "font-mono text-[13px] text-paper-ink underline decoration-paper-line underline-offset-4 hover:decoration-paper-ink break-all";
  if (EMAIL_RE.test(c)) return <a className={cls} href={`mailto:${c}`}>{c}</a>;
  if (PHONE_RE.test(c)) return <a className={cls} href={`tel:${c.replace(/[\s().-]/g, "")}`}>{c}</a>;
  return <span className="font-mono text-[13px] text-paper-ink break-words">{c}</span>;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}

function safeHref(url: string): string | null {
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(u)) return `https://${u}`;
  return null;
}

export default async function TagPage({ params }: Props) {
  const { code } = await params;
  const item = getItemByCode(code);
  if (!item) notFound();
  const owner = getOwner();
  const stats = item.publicStats.slice(0, 2);
  const links = owner.links.map((l) => ({ label: l.label, href: safeHref(l.url) })).filter((l) => l.href);
  const showModel = !!item.model3d && item.model3dPublic;

  return (
    <main className="flex-1 w-full bg-paper text-paper-ink">
      <div className="mx-auto w-full max-w-[440px] px-4 pb-14 pt-4 flex flex-col gap-3">
        {/* top row: mark + url pill */}
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-3.5 w-3.5 rotate-45 bg-lime" />
            <span className="font-display text-[15px] font-extrabold tracking-[-0.03em]">LOOT</span>
          </div>
          <span className="inline-flex h-7 items-center rounded-full border border-paper-line bg-white px-3 font-mono text-[11px] uppercase tracking-[0.1em] text-paper-muted">
            /t/{item.code.toLowerCase()}
          </span>
        </div>

        {item.lost && (
          <div role="status" className="rounded-tile bg-danger px-4 py-3 text-white">
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] opacity-90">Reported lost</div>
            <div className="mt-0.5 text-[14px] font-medium leading-snug">
              {owner.name} is looking for this. Please message them below.
            </div>
          </div>
        )}

        {item.lentTo && (
          <div role="status" className="rounded-tile bg-paper-ink px-4 py-3 text-paper">
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-lime">Currently with {item.lentTo}</div>
            <div className="mt-0.5 text-[14px] font-medium leading-snug">
              Borrowed from {owner.name}, not stolen.
              {item.lentDue ? ` Due back ${item.lentDue}.` : ""}
            </div>
          </div>
        )}

        {/* hero */}
        <section className="relative overflow-hidden rounded-card border border-paper-line bg-white">
          {item.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={uploadUrl(item.photo)}
              alt={`${item.nickname}, ${item.name}`}
              className="block h-[220px] w-full object-cover"
            />
          ) : (
            <div className="flex h-[220px] w-full flex-col items-center justify-center gap-2 bg-paper2">
              <span className="font-display text-[44px] font-extrabold tracking-[-0.04em] text-paper-muted/60">
                {item.code.split("-")[0]}
              </span>
              <span className={EYEBROW}>{item.category} · no photo yet</span>
            </div>
          )}
          <span className="absolute left-4 top-4 inline-flex h-6 items-center rounded-full bg-paper-ink px-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-lime">
            Verified owner tag
          </span>
        </section>

        {/* title */}
        <section className="px-1 pt-2">
          <div className={EYEBROW}>You found</div>
          <h1 className="mt-1 font-display text-[34px] font-extrabold leading-[1.02] tracking-[-0.03em] text-paper-ink">
            {item.nickname}
          </h1>
          <div className="mt-2 text-[15px] text-paper-muted">
            {item.name} <span className="mx-1 opacity-60">·</span>
            <span className="font-mono text-[13px] uppercase tracking-[0.08em]">{item.code}</span>
          </div>
        </section>

        {/* owner */}
        <section className="flex items-center gap-3 rounded-card border border-paper-line bg-white p-4">
          <div
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-paper-ink font-display text-[15px] font-bold tracking-[-0.02em] text-lime"
          >
            {initials(owner.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className={EYEBROW}>Belongs to</div>
            <div className="truncate text-[17px] font-bold leading-tight">{owner.name}</div>
            <div className="mt-1">
              <ContactLink contact={owner.contact} />
            </div>
          </div>
        </section>

        {/* finder note */}
        {item.finderNote && (
          <section className="rounded-card border border-paper-line bg-white p-5">
            <div className={EYEBROW}>From {owner.name.split(/\s+/)[0]}</div>
            <p className="mt-2 text-[16px] leading-relaxed text-paper-ink">{item.finderNote}</p>
          </section>
        )}

        {/* public stats */}
        {stats.length > 0 && (
          <section className="grid grid-cols-2 gap-2">
            {stats.map((s, i) => (
              <div key={i} className="rounded-tile bg-paper2 px-4 py-3.5">
                <div className={EYEBROW}>{s.label}</div>
                <div className="mt-1 truncate font-display text-[20px] font-bold tracking-[-0.02em]">{s.value}</div>
              </div>
            ))}
          </section>
        )}

        {/* actions (client) */}
        <FinderActions code={item.code} ownerName={owner.name} />

        {/* reward */}
        {owner.rewardLine && (
          <section className="rounded-card bg-lime p-5 text-on-lime">
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] opacity-80">Finder&apos;s reward</div>
            <div className="mt-1 font-display text-[18px] font-bold leading-snug tracking-[-0.02em]">{owner.rewardLine}</div>
          </section>
        )}

        {/* owner links */}
        {links.length > 0 && (
          <section className="rounded-card border border-paper-line bg-white p-2">
            <div className={`${EYEBROW} px-3 pb-1 pt-3`}>More from {owner.name.split(/\s+/)[0]}</div>
            <ul className="flex flex-col">
              {links.map((l) => (
                <li key={l.label + l.href}>
                  <a
                    href={l.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-tile px-3 py-3 text-[15px] font-semibold text-paper-ink hover:bg-paper2 hover:no-underline"
                  >
                    <span className="truncate">{l.label}</span>
                    <span aria-hidden className="font-mono text-paper-muted">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 3D model: only when the owner uploaded one and made it public */}
        {showModel && (
          <section className="rounded-card border border-paper-line bg-white p-4">
            {/* ModelSection prints its own eyebrow with the drag / AR hint */}
            <ModelSection item={item} editable={false} />
          </section>
        )}

        <footer className="pt-6 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-paper-muted">
          Tag {item.code} · LOOT lost &amp; found
        </footer>
      </div>
    </main>
  );
}
