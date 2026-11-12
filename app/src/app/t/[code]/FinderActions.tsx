"use client";

import { useEffect, useState, type FormEvent } from "react";

// The two finder actions on the public tag page, plus the one-per-session
// scan log. Everything else on the page is server-rendered and works
// without JS; these need fetch (message) and navigator.geolocation (share).

type Props = { code: string; ownerName: string };
type Phase = "idle" | "sending" | "sent" | "error";

const FIELD =
  "h-11 w-full rounded-xl border border-paper-line bg-white px-3.5 text-[15px] text-paper-ink placeholder:text-paper-muted/70 focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-2";
const EYEBROW = "font-mono text-[11px] uppercase tracking-[0.12em] text-paper-muted";
const PRIMARY =
  "flex h-[54px] w-full items-center justify-center rounded-full bg-paper-ink px-5 text-[16px] font-bold text-lime disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-2";
const SECONDARY =
  "flex h-[54px] w-full items-center justify-center rounded-full border border-paper-ink/25 bg-white px-5 text-[16px] font-bold text-paper-ink hover:border-paper-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-2";
const SMALL = "inline-flex h-10 items-center justify-center rounded-full px-4 text-[14px] font-semibold";

async function post(code: string, action: "scan" | "message" | "location", body: Record<string, unknown>) {
  const res = await fetch(`/api/t/${encodeURIComponent(code.toLowerCase())}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: action === "scan",
  });
  if (!res.ok) {
    let msg = res.status === 429 ? "Too many requests. Try again in a few minutes." : "Something went wrong.";
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error && res.status === 400) msg = j.error;
    } catch { /* keep default */ }
    throw new Error(msg);
  }
}

export function FinderActions({ code, ownerName }: Props) {
  const first = ownerName.split(/\s+/)[0] || ownerName;
  const [open, setOpen] = useState<"none" | "message" | "location">("none");

  // scan log: once per browser session per code; never on server render
  useEffect(() => {
    const key = `loot.scanned.${code.toLowerCase()}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      /* private mode: still log once for this mount */
    }
    post(code, "scan", { website: "" }).catch(() => {});
  }, [code]);

  // ----- message -----
  const [mPhase, setMPhase] = useState<Phase>("idle");
  const [mError, setMError] = useState("");
  const [mName, setMName] = useState("");
  const [mContact, setMContact] = useState("");
  const [mText, setMText] = useState("");
  const [mWebsite, setMWebsite] = useState("");

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!mText.trim()) { setMError("Write a short message first."); return; }
    setMPhase("sending"); setMError("");
    try {
      await post(code, "message", { name: mName, contact: mContact, message: mText, website: mWebsite });
      setMPhase("sent");
    } catch (err) {
      setMPhase("error"); setMError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  // ----- location -----
  const [lPhase, setLPhase] = useState<Phase>("idle");
  const [lError, setLError] = useState("");
  const [geo, setGeo] = useState<"idle" | "asking" | "ok" | "denied">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [lName, setLName] = useState("");
  const [place, setPlace] = useState("");
  const [lWebsite, setLWebsite] = useState("");

  function askLocation() {
    setOpen("location");
    if (geo === "ok" || geo === "asking") return;
    if (typeof navigator === "undefined" || !navigator.geolocation) { setGeo("denied"); return; }
    setGeo("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy) });
        setGeo("ok");
      },
      () => setGeo("denied"),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  async function sendLocation(e: FormEvent) {
    e.preventDefault();
    if (!coords && !place.trim()) { setLError("Allow location or type where you found it."); return; }
    setLPhase("sending"); setLError("");
    try {
      await post(code, "location", {
        name: lName, place, website: lWebsite,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      });
      setLPhase("sent");
    } catch (err) {
      setLPhase("error"); setLError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <button type="button" className={PRIMARY} onClick={() => setOpen(open === "message" ? "none" : "message")} aria-expanded={open === "message"}>
        Message {first}
      </button>

      {open === "message" && (
        <div className="rounded-card border border-paper-line bg-white p-4">
          {mPhase === "sent" ? (
            <div className="py-2">
              <div className={EYEBROW}>Sent</div>
              <p className="mt-1 text-[15px] leading-snug">Thanks. {first} will see your message right away.</p>
            </div>
          ) : (
            <form onSubmit={sendMessage} className="flex flex-col gap-2.5">
              <div className={EYEBROW}>Message {first}</div>
              <input className={FIELD} name="name" aria-label="Your name" placeholder="Your name" value={mName} onChange={(e) => setMName(e.target.value)} maxLength={80} autoComplete="name" />
              <input className={FIELD} name="contact" aria-label="Phone or email so they can reply" placeholder="Phone or email so they can reply" value={mContact} onChange={(e) => setMContact(e.target.value)} maxLength={160} autoComplete="tel" />
              <textarea
                className={`${FIELD} h-auto min-h-[96px] py-3`}
                name="message"
                aria-label="Message"
                placeholder="Where is it? When can they pick it up?"
                value={mText}
                onChange={(e) => setMText(e.target.value)}
                maxLength={2000}
                required
              />
              <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden>
                <label>Website <input name="website" tabIndex={-1} autoComplete="off" value={mWebsite} onChange={(e) => setMWebsite(e.target.value)} /></label>
              </div>
              {mError && <p role="alert" className="text-[13px] text-danger">{mError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" className={`${SMALL} bg-lime text-on-lime disabled:opacity-50`} disabled={mPhase === "sending"}>
                  {mPhase === "sending" ? "Sending…" : "Send"}
                </button>
                <button type="button" className={`${SMALL} border border-paper-line text-paper-muted`} onClick={() => setOpen("none")}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <button type="button" className={SECONDARY} onClick={() => (open === "location" ? setOpen("none") : askLocation())} aria-expanded={open === "location"}>
        Share where I found it
      </button>

      {open === "location" && (
        <div className="rounded-card border border-paper-line bg-white p-4">
          {lPhase === "sent" ? (
            <div className="py-2">
              <div className={EYEBROW}>Pinned</div>
              <p className="mt-1 text-[15px] leading-snug">Thanks. The spot is on {first}&apos;s map now.</p>
            </div>
          ) : (
            <form onSubmit={sendLocation} className="flex flex-col gap-2.5">
              <div className={EYEBROW}>Where you found it</div>
              <div className="rounded-tile bg-paper2 px-4 py-3 font-mono text-[12px] uppercase tracking-[0.08em] text-paper-muted">
                {geo === "asking" && "Locating…"}
                {geo === "ok" && coords && (
                  <span className="text-paper-ink">Pinned · {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)} · ±{coords.acc} m</span>
                )}
                {geo === "denied" && "No position. Describe the place below."}
                {geo === "idle" && "Waiting for location"}
              </div>
              <input className={FIELD} name="place" aria-label="Place where you found it (optional)" placeholder="Place, e.g. café on the corner (optional)" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={200} />
              <input className={FIELD} name="name" aria-label="Your name (optional)" placeholder="Your name (optional)" value={lName} onChange={(e) => setLName(e.target.value)} maxLength={80} autoComplete="name" />
              <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden>
                <label>Website <input name="website" tabIndex={-1} autoComplete="off" value={lWebsite} onChange={(e) => setLWebsite(e.target.value)} /></label>
              </div>
              {lError && <p role="alert" className="text-[13px] text-danger">{lError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" className={`${SMALL} bg-lime text-on-lime disabled:opacity-50`} disabled={lPhase === "sending" || geo === "asking"}>
                  {lPhase === "sending" ? "Sending…" : "Send location"}
                </button>
                {geo === "denied" && (
                  <button type="button" className={`${SMALL} border border-paper-line text-paper-muted`} onClick={() => { setGeo("idle"); askLocation(); }}>
                    Retry
                  </button>
                )}
                <button type="button" className={`${SMALL} border border-paper-line text-paper-muted`} onClick={() => setOpen("none")}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
