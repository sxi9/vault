import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BASE_URL } from "@/lib/config";
import { getOwner } from "@/lib/db";
import { logout } from "@/app/login/actions";
import { updateOwnerAction } from "./actions";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const owner = getOwner();
  const localhost = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(BASE_URL);
  const hasPassword = Boolean(process.env.OWNER_PASSWORD);
  const linksText = owner.links.map((l) => `${l.label} | ${l.url}`).join("\n");

  return (
    <Shell>
      <div className="max-w-[760px] mx-auto">
        <p className="label mb-3">Settings &middot; /{owner.handle}</p>
        <h1 className="font-display font-extrabold tracking-[-0.03em] leading-[1] text-[clamp(32px,6vw,48px)] mb-3">You, on every tag</h1>
        <p className="text-sm text-ink3 mb-8 max-w-[520px]">
          This is what a finder sees under the item: who it belongs to, how to reach you, and what you offer for bringing it back.
        </p>

        {saved && (
          <p role="status" className="mb-6 tile text-sm text-limeInk font-semibold">
            Saved.
          </p>
        )}
        {error && (
          <p role="alert" className="mb-6 tile border border-danger text-sm text-danger font-semibold">
            {error}
          </p>
        )}

        <form action={updateOwnerAction} className="flex flex-col gap-6">
          <section className="card flex flex-col gap-5">
            <p className="label">Owner</p>
            <div className="grid gap-4 min-[600px]:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="label">Handle</span>
                <div className="flex items-center">
                  <span className="h-11 inline-flex items-center px-3 rounded-l-[12px] border border-r-0 border-line bg-panel2 font-mono text-sm text-ink3">/</span>
                  <input className="input rounded-l-none font-mono" name="handle" defaultValue={owner.handle} required maxLength={24} pattern="[A-Za-z0-9_-]+" />
                </div>
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Name</span>
                <input className="input" name="name" defaultValue={owner.name} required maxLength={80} />
              </label>
            </div>
            <label className="flex flex-col gap-2">
              <span className="label">Bio</span>
              <textarea className="input" name="bio" defaultValue={owner.bio} maxLength={300} rows={2} />
            </label>
          </section>

          <section className="card flex flex-col gap-5">
            <p className="label">For finders</p>
            <label className="flex flex-col gap-2">
              <span className="label">Contact</span>
              <input className="input" name="contact" defaultValue={owner.contact} maxLength={160} placeholder="+49 170 000 0000 or you@example.com" />
              <span className="text-xs text-ink4">Shown on every tag page as the way to reach you. Use something you are happy to make public.</span>
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">Reward line</span>
              <input className="input" name="rewardLine" defaultValue={owner.rewardLine} maxLength={140} placeholder="Bring it back and the coffee is on me." />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">Links</span>
              <textarea
                className="input font-mono text-sm"
                name="links"
                defaultValue={linksText}
                rows={4}
                placeholder={"Instagram | https://instagram.com/you\nWebsite | https://example.com"}
              />
              <span className="text-xs text-ink4">One per line, as <span className="font-mono text-ink3">label | url</span>. Up to 8.</span>
            </label>
          </section>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary">
              Save settings
            </button>
          </div>
        </form>

        <section className="card mt-8 flex flex-col gap-3">
          <p className="label">Sticker URL</p>
          <p className="font-mono text-sm break-all text-ink">{BASE_URL}</p>
          {localhost ? (
            <p className="text-sm text-danger font-semibold">
              This is a local address. Stickers will encode this URL and will not open on anyone else&apos;s phone. Set{" "}
              <span className="font-mono">BASE_URL</span> to your public origin before printing.
            </p>
          ) : (
            <p className="text-xs text-ink4">
              Every QR encodes <span className="font-mono text-ink3">{BASE_URL}/t/&lt;code&gt;</span>. Change <span className="font-mono text-ink3">BASE_URL</span> in the environment to move it.
            </p>
          )}
        </section>

        <section className="card mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="label mb-1">Appearance &amp; session</p>
            <p className="text-xs text-ink4">
              {hasPassword ? "Your owner session lasts 30 days on this device." : "No OWNER_PASSWORD set: the vault is open in development."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {hasPassword && (
              <form action={logout}>
                <button type="submit" className="btn h-9 px-3 text-[13px]">
                  Log out
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </Shell>
  );
}
