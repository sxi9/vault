import type { Metadata } from "next";
import Link from "next/link";
import { login } from "./actions";

export const metadata: Metadata = { title: "Log in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  const open = !process.env.OWNER_PASSWORD && process.env.NODE_ENV !== "production";

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center gap-2.5 mb-8">
          <span aria-hidden className="block w-[14px] h-[14px] bg-lime rotate-45 rounded-[2px]" />
          <span className="font-display font-extrabold text-[20px] leading-none tracking-[-0.03em]">LOOT</span>
          <span className="font-mono text-[12px] text-ink3 leading-none">lost &amp; found</span>
        </div>

        <div className="card">
          <p className="label mb-3">Owner access</p>
          <h1 className="font-display font-extrabold tracking-[-0.03em] leading-[1.05] text-[32px] mb-2">Open the vault</h1>
          <p className="text-sm text-ink2 mb-6">Tag pages stay public. This door is for you only.</p>

          {open ? (
            <div className="tile text-sm text-ink2">
              <p className="mb-3">
                No <span className="font-mono text-ink">OWNER_PASSWORD</span> is set, so the vault is open in development.
              </p>
              <Link href="/" className="btn btn-primary hover:no-underline w-full">
                Go to the inventory
              </Link>
            </div>
          ) : (
            <form action={login} className="flex flex-col gap-4">
              <input type="hidden" name="next" value={next} />
              <label className="flex flex-col gap-2">
                <span className="label">Password</span>
                <input
                  className="input"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  autoFocus
                  required
                  placeholder="Your owner password"
                />
              </label>
              {sp.error && (
                <p role="alert" className="text-sm text-danger font-semibold">
                  {sp.error === "locked"
                    ? "Too many attempts. Wait 15 minutes, then try again."
                    : "That password did not open the vault. Try again."}
                </p>
              )}
              <button type="submit" className="btn btn-primary w-full">
                Unlock
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-ink4 mt-6 text-center font-mono tracking-[0.08em] uppercase">Found something? Scan its sticker.</p>
      </div>
    </div>
  );
}
