"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Inventory", short: "Vault", glyph: "[ ]" },
  { href: "/activity", label: "Activity", short: "Activity", glyph: "~" },
  { href: "/stickers", label: "Stickers", short: "Stickers", glyph: "#" },
  { href: "/settings", label: "Settings", short: "Settings", glyph: "=" },
] as const;

function isActive(path: string, href: string): boolean {
  if (href === "/") return path === "/" || path.startsWith("/items");
  return path === href || path.startsWith(`${href}/`);
}

/** Desktop pill nav (hidden below 720px). */
export function DesktopNav() {
  const path = usePathname();
  return (
    <nav aria-label="Primary" className="hidden min-[720px]:flex items-center gap-1 p-1 rounded-full bg-panel border border-line">
      {NAV.map((n) => {
        const active = isActive(path, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`h-9 px-4 inline-flex items-center rounded-full text-sm font-semibold hover:no-underline transition-colors ${
              active ? "bg-ink text-bg" : "text-sub hover:text-ink"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Fixed bottom tab bar (phone only, below 720px). */
export function BottomBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="min-[720px]:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-[var(--bgA)] backdrop-blur-[14px]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-4 px-2 py-1.5 gap-1">
        {NAV.map((n) => {
          const active = isActive(path, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`h-12 rounded-[14px] flex flex-col items-center justify-center gap-0.5 hover:no-underline transition-colors ${
                active ? "bg-ink text-bg" : "text-sub"
              }`}
            >
              <span className="font-mono text-[12px] leading-none">{n.glyph}</span>
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase leading-none">{n.short}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
