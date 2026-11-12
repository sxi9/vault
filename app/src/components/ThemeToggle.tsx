"use client";

import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function subscribe(onChange: () => void): () => void {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

/** Toggles `html[data-theme]` and persists the choice in localStorage (`loot.theme`). */
export function ThemeToggle({ className = "" }: { className?: string }) {
  // Server snapshot is "dark" (the default theme); the client snapshot reads the attribute
  // that layout.tsx's inline script sets before paint.
  const theme = useSyncExternalStore(subscribe, readTheme, () => "dark" as Theme);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("loot.theme", next);
    } catch {
      /* private mode: nothing to persist */
    }
  }

  return (
    <button type="button" onClick={toggle} className={`btn h-9 px-3 text-[13px] ${className}`} aria-live="polite">
      {theme === "light" ? "Dark mode" : "Light mode"}
    </button>
  );
}
