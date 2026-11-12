import Link from "next/link";
import type { ReactNode } from "react";
import { getOwner } from "@/lib/db";
import { logout } from "@/app/login/actions";
import { ThemeToggle } from "./ThemeToggle";
import { BottomBar, DesktopNav } from "./ShellNav";

/**
 * Owner app chrome: sticky blurred header with logo, desktop pill nav, theme
 * toggle and the primary "+ Add item" link; a fixed bottom tab bar below 720px.
 * `title`, when given, is rendered as the page headline above `children`.
 */
export function Shell({ children, title }: { children: ReactNode; title?: string }) {
  const owner = getOwner();
  const hasPassword = Boolean(process.env.OWNER_PASSWORD);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line2 bg-[var(--bgA)] backdrop-blur-[14px]">
        <div className="mx-auto max-w-[1320px] px-[clamp(16px,4vw,48px)] h-16 flex items-center gap-3 min-[720px]:gap-4">
          <Link href="/" className="flex items-center gap-2.5 text-ink hover:no-underline shrink-0" aria-label="LOOT home">
            <span aria-hidden className="block w-[14px] h-[14px] bg-lime rotate-45 rounded-[2px]" />
            <span className="font-display font-extrabold text-[20px] leading-none tracking-[-0.03em]">LOOT</span>
            <span className="font-mono text-[12px] text-ink3 leading-none">/{owner.handle}</span>
          </Link>

          <div className="flex-1" />

          <DesktopNav />

          <div className="flex items-center gap-2 min-w-0">
            {/* Below 720px the toggle lives on /settings; the header must fit 390px. */}
            <span className="hidden min-[720px]:block">
              <ThemeToggle />
            </span>
            {hasPassword && (
              <form action={logout} className="hidden min-[720px]:block">
                <button type="submit" className="btn h-9 px-3 text-[13px]">
                  Log out
                </button>
              </form>
            )}
            <Link href="/items/new" className="btn btn-primary h-10 px-4 hover:no-underline whitespace-nowrap">
              <span aria-hidden>+</span> Add item
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto max-w-[1320px] px-[clamp(16px,4vw,48px)] pt-8 pb-28 min-[720px]:pb-16">
        {title && (
          <h1 className="font-display font-extrabold tracking-[-0.03em] leading-[1.05] text-[clamp(28px,5vw,44px)] mb-6">
            {title}
          </h1>
        )}
        {children}
      </main>

      <BottomBar />
    </>
  );
}
